import MontenegroDashboard from '../components/MontenegroDashboard';
import Head from 'next/head';

export default function MontenegroPage() {
  return (
    <>
      <Head>
        <title>Montenegro Dashboard - CleanApp</title>
        <meta name="description" content="Interactive map dashboard for Montenegro with city information and statistics" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <MontenegroDashboard />
    </>
  );
} 