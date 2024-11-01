import express from 'express';
import serverless from 'serverless-http';
import path from 'path';

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (if any)
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/success', (req, res) => {
  const { username } = req.query;
  res.render('success', { username });
});

app.get('/error', (req, res) => {
  const { message } = req.query;
  res.render('error', { message });
});

// Local development server
// if (process.env.NODE_ENV !== 'production') {
//   const port = process.env.PORT || 3000;
//   app.listen(port, () => {
//     console.log(`Frontend app listening at http://localhost:${port}`);
//   });
// }

// Lambda handler
export const handler = serverless(app);
