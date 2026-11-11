import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { IndexSurface } from './components/IndexSurface';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <IndexSurface />
    </MotionConfig>
  </React.StrictMode>,
);
