fetch("http://localhost:3100/dashboard")
  .then(res => console.log(res.status))
  .catch(err => console.error(err));
