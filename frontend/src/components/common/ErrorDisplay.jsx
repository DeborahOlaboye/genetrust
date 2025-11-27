import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Button, Typography, Box, Collapse, IconButton } from '@mui/material';
import { Close as CloseIcon, Refresh as RefreshIcon, ReportProblem as ReportProblemIcon } from '@mui/icons-material';
import { getUserFriendlyMessage, ERROR_CODES } from '../../utils/errorUtils';

/**
 * ErrorDisplay - A component to display user-friendly error messages
 */
const ErrorDisplay = ({
  error,
  onRetry,
  onClose,
  title = 'Something went wrong',
  showDetails = false,
  showRetry = true,
  showClose = false,
  severity = 'error',
  fullWidth = false,
  sx = {},
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const errorMessage = getUserFriendlyMessage(error);
  const errorCode = error?.code || (error?.response?.status ? `HTTP_${error.response.status}` : null);
  const errorDetails = error?.stack || error?.message || 'No additional details available';
  const showExpand = process.env.NODE_ENV === 'development' && errorDetails;

  // Get a more specific title based on error type if available
  const getErrorTitle = () => {
    if (error?.code) {
      const errorTitles = {
        [ERROR_CODES.NETWORK_OFFLINE]: 'Connection Error',
        [ERROR_CODES.API_UNAUTHORIZED]: 'Authentication Required',
        [ERROR_CODES.API_FORBIDDEN]: 'Access Denied',
        [ERROR_CODES.API_NOT_FOUND]: 'Not Found',
        [ERROR_CODES.API_SERVER_ERROR]: 'Server Error',
        [ERROR_CODES.WALLET_NOT_CONNECTED]: 'Wallet Not Connected',
        [ERROR_CODES.WALLET_TRANSACTION_REJECTED]: 'Transaction Rejected',
      };
      return errorTitles[error.code] || title;
    }
    return title;
  };

  // Get a more specific severity based on error type
  const getSeverity = () => {
    if (severity) return severity;
    
    if (error?.code) {
      // Map specific error codes to severity levels
      const errorSeverities = {
        [ERROR_CODES.NETWORK_OFFLINE]: 'warning',
        [ERROR_CODES.API_UNAUTHORIZED]: 'warning',
        [ERROR_CODES.API_FORBIDDEN]: 'error',
        [ERROR_CODES.API_NOT_FOUND]: 'info',
        [ERROR_CODES.WALLET_TRANSACTION_REJECTED]: 'info',
      };
      
      return errorSeverities[error.code] || 'error';
    }
    
    return 'error';
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const currentSeverity = getSeverity();
  const errorTitle = getErrorTitle();

  return (
    <Box
      sx={{
        width: fullWidth ? '100%' : 'auto',
        maxWidth: 800,
        mx: 'auto',
        my: 2,
        ...sx,
      }}
    >
      <Alert
        severity={currentSeverity}
        action={
          <>
            {showClose && (
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={onClose}
                sx={{ ml: 1 }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            )}
          </>
        }
        iconMapping={{
          error: <ReportProblemIcon fontSize="large" />,
          warning: <ReportProblemIcon fontSize="large" />,
          info: <ReportProblemIcon fontSize="large" />,
          success: <ReportProblemIcon fontSize="large" />,
        }}
        sx={{
          '& .MuiAlert-icon': {
            alignItems: 'center',
            mt: 0.5,
          },
          '& .MuiAlert-message': {
            width: '100%',
          },
          ...(sx?.root || {}),
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {errorTitle}
          </Typography>
          
          <Typography variant="body1" gutterBottom>
            {errorMessage}
          </Typography>
          
          {errorCode && (
            <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
              Error code: {errorCode}
            </Typography>
          )}
          
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {showRetry && (
              <Button
                variant="contained"
                color={currentSeverity === 'warning' ? 'warning' : 'primary'}
                startIcon={<RefreshIcon />}
                onClick={handleRetry}
                size="small"
              >
                Try Again
              </Button>
            )}
            
            {showExpand && (
              <Button
                variant="outlined"
                size="small"
                onClick={handleExpandClick}
                sx={{ ml: 1 }}
              >
                {expanded ? 'Hide Details' : 'Show Details'}
              </Button>
            )}
          </Box>
          
          {showExpand && (
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Box
                component="pre"
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  overflowX: 'auto',
                  fontSize: '0.75rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {typeof errorDetails === 'string' 
                  ? errorDetails 
                  : JSON.stringify(errorDetails, null, 2)}
              </Box>
            </Collapse>
          )}
        </Box>
      </Alert>
    </Box>
  );
};

ErrorDisplay.propTypes = {
  /**
   * The error object to display
   */
  error: PropTypes.oneOfType([
    PropTypes.instanceOf(Error),
    PropTypes.shape({
      message: PropTypes.string,
      code: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      stack: PropTypes.string,
      response: PropTypes.shape({
        status: PropTypes.number,
        data: PropTypes.any,
      }),
    }),
    PropTypes.string,
  ]),
  
  /**
   * Function to call when retry button is clicked
   */
  onRetry: PropTypes.func,
  
  /**
   * Function to call when close button is clicked
   */
  onClose: PropTypes.func,
  
  /**
   * Custom title to display
   */
  title: PropTypes.string,
  
  /**
   * Whether to show error details (stack trace, etc.)
   */
  showDetails: PropTypes.bool,
  
  /**
   * Whether to show the retry button
   */
  showRetry: PropTypes.bool,
  
  /**
   * Whether to show the close button
   */
  showClose: PropTypes.bool,
  
  /**
   * Severity of the error ('error', 'warning', 'info', 'success')
   */
  severity: PropTypes.oneOf(['error', 'warning', 'info', 'success']),
  
  /**
   * Whether the component should take full width
   */
  fullWidth: PropTypes.bool,
  
  /**
   * Additional styles
   */
  sx: PropTypes.object,
};

export default ErrorDisplay;
