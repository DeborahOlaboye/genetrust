import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-blue-600 dark:text-blue-400">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">
          Page not found
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Button
            onClick={() => navigate('/')}
            variant="primary"
            className="px-6 py-2"
          >
            Go back home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
