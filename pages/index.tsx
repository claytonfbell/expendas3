import Head from "next/head"
import { Inside } from "../lib/Inside"

export default function Home() {
  return (
    <>
      <Head>
        <title>Expendas</title>
        <meta name="description" content="Expendas" />
      </Head>

      <Inside title="Expendas" breadcrumbs={[]}>
        {" "}
      </Inside>

      {/* <ReactQueryDevtools /> */}
    </>
  )
}
