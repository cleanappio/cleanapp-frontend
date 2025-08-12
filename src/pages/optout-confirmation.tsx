import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';

export default function OptoutConfirmation() {
  const router = useRouter();
  const { email, error } = router.query;
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <>
      <Head>
        <title>CleanApp Opt Out Confirmation</title>
        <meta name="description" content="CleanApp email opt out confirmation" />
      </Head>
      
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <Image 
              src="/cleanapp-logo.png" 
              alt="CleanApp Logo" 
              width={200} 
              height={80}
              style={{ maxWidth: '200px' }} 
            />
          </div>
          
          <h1 style={{ color: '#2c6e49' }}>
            {error ? 'CleanApp Opt Out Error' : 'CleanApp Opt Out Email'}
          </h1>
          
          {error ? (
            <div>
              <p style={{ fontSize: '18px', color: '#d32f2f' }}>
                There was an error processing your opt out request.
              </p>
              <p style={{ fontSize: '16px', color: '#666', marginTop: '20px' }}>
                Please try again or contact support if the issue persists.
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '18px', color: '#333' }}>
                You have successfully opted out from receiving CleanApp reports.
              </p>
              {email && (
                <p style={{ fontSize: '16px', color: '#666', marginTop: '20px' }}>
                  Email: <strong>{email}</strong>
                </p>
              )}
              <p style={{ fontSize: '16px', color: '#666', marginTop: '20px' }}>
                You will no longer receive email notifications from CleanApp.
              </p>
            </div>
          )}
          
          <div style={{ marginTop: '40px' }}>
            <button
              onClick={() => router.push('/')}
              style={{
                backgroundColor: '#2c6e49',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer',
                textDecoration: 'none',
                display: 'inline-block'
              }}
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
