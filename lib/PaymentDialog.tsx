import {
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  Radio,
  RadioGroup,
  Typography,
} from "@material-ui/core"
import { Payment } from "@prisma/client"
import { Alert, Button } from "material-ui-bootstrap"
import {
  Checkbox,
  CheckboxBase,
  CurrencyField,
  DatePicker,
  Form,
  Select,
  SubmitButton,
  TextField,
} from "material-ui-pack"
import moment from "moment-timezone"
import React, { ChangeEvent, useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import { displayAccountType } from "./accountTypes"
import {
  useAddPayment,
  useFetchAccounts,
  useRemovePayment,
  useUpdatePayment,
} from "./api/api"
import { RestError } from "./api/rest"
import DisplayError from "./DisplayError"
import { getRepeatingPaymentFeedback } from "./getRepeatingPaymentFeedback"

export type PaymentForm = Payment & {
  accountId2?: number
  isTransfer?: boolean
}

interface Props {
  payment: PaymentForm
  onClose: () => void
}

type RepeatsType = "weekly" | "dates"

export function PaymentDialog(props: Props) {
  const [state, setState] = useState<PaymentForm>(props.payment)
  useEffect(() => {
    setIsIncome(props.payment.amount > 0)
    setState({
      ...props.payment,
      amount: Number(Math.abs(props.payment.amount).toFixed(2)),
    })
  }, [props.payment])

  const [error, setError] = useState<RestError>()

  const { mutateAsync: addPayment, isLoading: isCreatingPayment } =
    useAddPayment()
  const { mutateAsync: updatePayment, isLoading: isUpdatingPayment } =
    useUpdatePayment()
  const { mutateAsync: deletePayment, isLoading: isRemovingPayment } =
    useRemovePayment()

  const isBusy = isCreatingPayment || isUpdatingPayment || isRemovingPayment

  async function handleSubmit() {
    try {
      setError(undefined)
      if (state.id === 0) {
        if (state.isTransfer) {
          if (state.accountId === 0) {
            const err: RestError = {
              status: 0,
              message: "Select account to transfer from.",
            }
            throw err
          }
          if ((state.accountId2 || 0) === 0) {
            const err: RestError = {
              status: 0,
              message: "Select account to transfer to.",
            }
            throw err
          }
          if (state.accountId === state.accountId2) {
            const err: RestError = {
              status: 0,
              message: "Select a different account to transfer to.",
            }
            throw err
          }
          if (Number(state.amount) <= 0) {
            const err: RestError = {
              status: 0,
              message: "Enter the amount to transfer.",
            }
            throw err
          }
          // submit two payments if transfer
          await addPayment({
            ...state,
            amount: -Number(state.amount),
            description: `Transfer to ${
              accounts.find((x) => x.id === state.accountId2)?.name
            }`,
          })
          await addPayment({
            ...state,
            accountId: state.accountId2 || 0,
            description: `Transfer from ${
              accounts.find((x) => x.id === state.accountId)?.name
            }`,
          })
          // refreshCycleItems()
          props.onClose()
        } else {
          await addPayment({
            ...state,
            amount: isIncome ? Number(state.amount) : -Number(state.amount),
          })
          // refreshCycleItems()
          props.onClose()
        }
      } else {
        await updatePayment({
          ...state,
          amount: isIncome ? Number(state.amount) : -Number(state.amount),
        })
        // refreshCycleItems()
        props.onClose()
      }
    } catch (e) {
      setError(e)
    }
  }

  const { data: unsortedAccounts = [] } = useFetchAccounts()

  const accounts = [...unsortedAccounts].sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  const [isIncome, setIsIncome] = useState(false)
  const thirtyOneDays = Array.from(Array(31).keys())
  const twelveMonths = Array.from(Array(12).keys())
  const repeats =
    state.repeatsOnDaysOfMonth.length > 0 || state.repeatsWeekly !== null
  const repeatsMonths = state.repeatsOnMonthsOfYear.length > 0
  const repeatsType: RepeatsType =
    state.repeatsWeekly !== null ? "weekly" : "dates"
  const repeatsUntil = state.repeatsUntilDate !== null

  const [willDelete, setWillDelete] = useState<Payment>()

  const feedback = getRepeatingPaymentFeedback(state)

  // auto-select date of month if they change start date
  useEffect(() => {
    if (state.repeatsOnDaysOfMonth.length > 0) {
      const newArray = [...state.repeatsOnDaysOfMonth]
      const x = moment(state.date).date()
      if (!newArray.includes(x)) {
        newArray.push(x)
        newArray.sort((a, b) => a - b)
        setState((prev) => ({
          ...prev,
          repeatsOnDaysOfMonth: newArray,
        }))
      }
    }
  }, [state.date, state.repeatsOnDaysOfMonth])

  // auto-select monthif they change start date
  useEffect(() => {
    if (state.repeatsOnMonthsOfYear.length > 0) {
      const newArray = [...state.repeatsOnMonthsOfYear]
      const x = moment(state.date).month()
      if (!newArray.includes(x)) {
        newArray.push(x)
        newArray.sort((a, b) => a - b)
        setState((prev) => ({
          ...prev,
          repeatsOnMonthsOfYear: newArray,
        }))
      }
    }
  }, [state.date, state.repeatsOnMonthsOfYear])

  return (
    <Dialog open={props.payment !== undefined} onClose={props.onClose}>
      <DialogTitle>
        {state.id === 0 ? `Create ` : ``}
        {state.isTransfer
          ? "Account Transfer"
          : isIncome
          ? `Deposit`
          : `Payment`}
      </DialogTitle>
      <DialogContent>
        <DisplayError error={error} />
        <Form
          busy={isBusy}
          margin="normal"
          state={state}
          setState={setState}
          size="small"
          onSubmit={handleSubmit}
        >
          <Collapse in={state.id === 0}>
            <Checkbox name="isTransfer" label="Account Transfer" />
          </Collapse>

          <Collapse in={!state.isTransfer}>
            <CheckboxBase
              value={isIncome}
              onChange={(x) => setIsIncome(x)}
              label="Income Deposit"
            />
          </Collapse>

          <Collapse in={isIncome}>
            <Checkbox name="isPaycheck" />
          </Collapse>

          <CurrencyField name="amount" numeric blankZero inPennies fullWidth />
          <Collapse in={!state.isTransfer}>
            <TextField name="description" label="Description" />
          </Collapse>
          <Select
            allowNull
            isNumeric
            name="accountId"
            label={state.isTransfer || !isIncome ? "From Account" : "Account"}
            options={accounts.map((x) => ({
              value: x.id,
              label: `${x.name} ${displayAccountType(x.accountType)}`,
            }))}
          />
          <Collapse in={state.isTransfer}>
            <Select
              allowNull
              isNumeric
              name="accountId2"
              label="Transfer To"
              options={accounts.map((x) => ({
                value: x.id,
                label: `${x.name} ${displayAccountType(x.accountType)}`,
              }))}
            />
          </Collapse>
          <DatePicker name="date" />

          <CheckboxBase
            value={repeats}
            onChange={(checked) => {
              if (!checked) {
                setState((prev) => ({
                  ...prev,
                  repeatsOnDaysOfMonth: [],
                  repeatsWeekly: null,
                  repeatsOnMonthsOfYear: [],
                  repeatsUntilDate: null,
                }))
              } else {
                setState((prev) => ({
                  ...prev,
                  repeatsOnDaysOfMonth: [],
                  repeatsWeekly: 1,
                  repeatsOnMonthsOfYear: [],
                  repeatsUntilDate: null,
                }))
              }
            }}
            label="Repeating Payment"
          />

          <Collapse in={repeats}>
            <FormControl component="fieldset">
              <RadioGroup
                value={repeatsType}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const newType = event.target.value as RepeatsType
                  if (newType === "dates") {
                    setState((prev) => ({
                      ...prev,
                      repeatsWeekly: null,
                      repeatsOnDaysOfMonth: [moment(state.date).date()],
                    }))
                  } else {
                    setState((prev) => ({
                      ...prev,
                      repeatsWeekly: 1,
                      repeatsOnDaysOfMonth: [],
                    }))
                  }
                }}
              >
                <FormControlLabel
                  value="weekly"
                  control={<Radio />}
                  label="Weekly"
                />
                <Collapse in={repeatsType === "weekly"}>
                  <Select
                    name="repeatsWeekly"
                    options={[1, 2, 3, 4, 5, 6, 7, 8].map((value) => ({
                      value,
                      label: `Every ${value > 1 ? `${value} weeks` : `week`}`,
                    }))}
                    isNumeric
                  />
                </Collapse>

                <FormControlLabel
                  value="dates"
                  control={<Radio />}
                  label="Monthly"
                />
              </RadioGroup>
            </FormControl>

            <Collapse in={repeatsType === "dates"}>
              {thirtyOneDays.map((x) => (
                <Button
                  key={x}
                  onClick={() => {
                    let arr =
                      state.repeatsOnDaysOfMonth === null
                        ? []
                        : state.repeatsOnDaysOfMonth
                    if (arr.includes(x + 1)) {
                      arr = arr.filter((y) => y !== x + 1)
                    } else {
                      arr = [...arr, x + 1]
                    }
                    setState((prev) => ({
                      ...prev,
                      repeatsOnDaysOfMonth:
                        arr.length > 0 ? arr.sort((a, b) => a - b) : [],
                    }))
                  }}
                  color={"primary"}
                  disabled={moment(state.date).date() === x + 1}
                  variant={
                    state.repeatsOnDaysOfMonth !== null &&
                    state.repeatsOnDaysOfMonth.includes(x + 1)
                      ? "contained"
                      : "text"
                  }
                >
                  {moment.localeData().ordinal(x + 1)}
                </Button>
              ))}
              <br />

              <CheckboxBase
                value={repeatsMonths}
                onChange={(checked) => {
                  if (!checked) {
                    setState((prev) => ({
                      ...prev,
                      repeatsOnMonthsOfYear: [],
                    }))
                  } else {
                    setState((prev) => ({
                      ...prev,
                      repeatsOnMonthsOfYear: [moment(state.date).month()],
                    }))
                  }
                }}
                label="On Months"
              />

              <Collapse in={repeatsMonths}>
                {twelveMonths.map((x) => (
                  <Button
                    key={x}
                    onClick={() => {
                      let arr =
                        state.repeatsOnMonthsOfYear === null
                          ? []
                          : state.repeatsOnMonthsOfYear
                      if (arr.includes(x)) {
                        arr = arr.filter((y) => y !== x)
                      } else {
                        arr = [...arr, x].sort()
                      }
                      setState((prev) => ({
                        ...prev,
                        repeatsOnMonthsOfYear:
                          arr.length > 0 ? arr.sort((a, b) => a - b) : [],
                      }))
                    }}
                    color={"primary"}
                    disabled={moment(state.date).month() === x}
                    variant={
                      state.repeatsOnMonthsOfYear !== null &&
                      state.repeatsOnMonthsOfYear.includes(x)
                        ? "contained"
                        : "text"
                    }
                  >
                    {moment().month(x).format("MMMM")}
                  </Button>
                ))}
              </Collapse>
            </Collapse>

            <CheckboxBase
              value={repeatsUntil}
              onChange={(checked) => {
                if (!checked) {
                  setState((prev) => ({
                    ...prev,
                    repeatsUntilDate: null,
                  }))
                } else {
                  setState((prev) => ({
                    ...prev,
                    repeatsUntilDate: moment()
                      .add(1, "years")
                      .format("YYYY-MM-DD"),
                  }))
                }
              }}
              label="Set End Date"
            />

            <Collapse in={repeatsUntil}>
              <DatePicker name="repeatsUntilDate" />
            </Collapse>

            <Alert color="info">{feedback.description}</Alert>

            {feedback.errors.length > 0 ? (
              <>
                <br />
                <Alert color="danger">
                  <ReactMarkdown>
                    {`${feedback.errors.join("  \n")}`}
                  </ReactMarkdown>
                </Alert>
              </>
            ) : null}
          </Collapse>

          <br />
          <Grid container spacing={1}>
            <Grid item xs={state.id !== undefined ? 4 : 6}>
              <SubmitButton>
                {state.id === undefined ? `Create` : `Save`}
              </SubmitButton>
            </Grid>
            <Grid item xs={state.id !== undefined ? 4 : 6}>
              <Button fullWidth variant="outlined" onClick={props.onClose}>
                Cancel
              </Button>
            </Grid>
            {state.id !== undefined && (
              <Grid item xs={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="danger"
                  onClick={() => setWillDelete(state)}
                >
                  Delete
                </Button>
              </Grid>
            )}
          </Grid>

          <br />
          <br />
        </Form>

        <Dialog
          open={willDelete !== undefined}
          onClose={() => setWillDelete(undefined)}
        >
          <DialogContent>
            <Typography>Are you sure you want to delete this item?</Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                if (willDelete !== undefined) {
                  deletePayment(willDelete)
                  //.then(refreshCycleItems)
                  setWillDelete(undefined)
                  props.onClose()
                }
              }}
            >
              Delete
            </Button>
            <Button onClick={() => setWillDelete(undefined)}>Cancel</Button>
          </DialogActions>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
