async function check() {
  const res = await fetch('https://wact-warehouse.vercel.app/integrity/report', { redirect: 'manual' });
  console.log('Status code:', res.status);
  console.log('Location header:', res.headers.get('location'));
}

check();
