import Link from 'next/link'

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Betabase</h1>
      <Link href="/gyms" className="mt-4 inline-block underline">
        Browse gyms →
      </Link>
    </main>
  )
}
