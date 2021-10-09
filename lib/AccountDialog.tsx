import {
  Box,
  Dialog,
  DialogContent,
  Grid,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import { Account } from "@prisma/client"
import { Form } from "material-ui-pack"
import React, { useEffect, useState } from "react"
import { debtGroup, investmentGroup } from "./AccountGroup"
import { accountTypeOptions } from "./accountTypes"
import { AccountWithIncludes } from "./AccountWithIncludes"
import { useAddAccount, useUpdateAccount } from "./api/api"
import { RestError } from "./api/rest"
import { creditCardTypeOptions } from "./creditCardTypes"
import { Currency } from "./Currency"
import { Percentage } from "./Percentage"
import { Title } from "./Title"

interface Props {
  account: Account | AccountWithIncludes | undefined
  onClose: () => void
}

export function AccountDialog(props: Props) {
  const [error, setError] = useState<RestError>()
  useEffect(() => {
    if (props.account !== undefined) {
      setError(undefined)
    }
  }, [props.account])

  const [state, setState] = useState<
    AccountWithIncludes | Account | undefined
  >()
  useEffect(() => {
    setState(props.account)
  }, [props.account])

  const { mutateAsync: updateAccount, isLoading: isUpdating } =
    useUpdateAccount()

  const { mutateAsync: addAccount, isLoading: isAdding } = useAddAccount()

  const isNew = state?.id === 0
  const isBusy = isUpdating || isAdding

  function handleSubmit() {
    if (state !== undefined) {
      if (isNew) {
        addAccount(state)
          .then(props.onClose)
          .catch((e) => setError(e))
      } else {
        if ("carryOver" in state) {
          updateAccount(state)
            .then(props.onClose)
            .catch((e) => setError(e))
        }
      }
    }
  }

  const theme = useTheme()
  const isXsDown = useMediaQuery(theme.breakpoints.down("xs"))

  return (
    <Dialog
      open={state !== undefined}
      onClose={props.onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={isXsDown}
    >
      <DialogContent>
        <Title label={isNew ? "Add New Account" : "Update Account"} />
        <Form
          state={state}
          setState={setState}
          size="small"
          margin="none"
          busy={isBusy}
          onSubmit={handleSubmit}
          onCancel={props.onClose}
          error={error?.message}
          submitLabel={isNew ? "Add Account" : "Save Changes"}
          schema={{
            name: "capitalize",
            accountType: { type: "select", options: accountTypeOptions },
            creditCardType:
              state?.accountType === "Credit_Card"
                ? { type: "select", options: creditCardTypeOptions }
                : undefined,
            balance: {
              type: "currency",
              inPennies: true,
              numeric: true,
              label:
                state?.accountType === "Investment"
                  ? "Current Balance"
                  : undefined,
              allowNegative:
                state !== undefined &&
                debtGroup.types.includes(state.accountType),
            },

            ...(state?.accountType !== undefined &&
            investmentGroup.types.includes(state?.accountType)
              ? {
                  totalDeposits: {
                    type: "currency",
                    inPennies: true,
                    numeric: true,
                    fullWidth: true,
                  },
                  totalFixedIncome: {
                    type: "currency",
                    inPennies: true,
                    numeric: true,
                    fullWidth: true,
                  },
                }
              : {}),
          }}
          layout={{
            totalFixedIncome:
              state === undefined
                ? undefined
                : {
                    xs: 12,
                    renderAfter: (
                      <Grid item xs={12}>
                        <Box paddingLeft={2} paddingRight={2} paddingBottom={2}>
                          <Grid
                            container
                            justifyContent="space-between"
                            spacing={2}
                          >
                            <Grid item>Equity</Grid>
                            <Grid item>
                              <Currency
                                value={
                                  state.balance - (state.totalFixedIncome || 0)
                                }
                              />
                            </Grid>
                          </Grid>

                          <Grid
                            container
                            justifyContent="space-between"
                            spacing={2}
                          >
                            <Grid item>Total Gain / Loss</Grid>
                            <Grid item>
                              <Currency
                                value={
                                  state.balance - (state.totalDeposits || 0)
                                }
                                green
                                red
                              />
                            </Grid>
                          </Grid>

                          <Grid
                            container
                            justifyContent="space-between"
                            spacing={2}
                          >
                            <Grid item>Total Gain / Loss</Grid>
                            <Grid item>
                              <Percentage
                                value={
                                  (state.balance - (state.totalDeposits || 0)) /
                                  (state.totalDeposits || state.balance)
                                }
                                green
                                red
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      </Grid>
                    ),
                  },
          }}
        />

        <br />
      </DialogContent>
    </Dialog>
  )
}
