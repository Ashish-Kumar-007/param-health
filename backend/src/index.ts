import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Import routes (will be added later)
import rosterRoutes from './routes/rosterRoutes';
app.use('/api/rosters', rosterRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
