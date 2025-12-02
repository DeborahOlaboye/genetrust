const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
      
      // Log additional performance metrics in development
      if (process.env.NODE_ENV === 'development') {
        // Log to console in development
        const logWebVitals = (metric) => {
          console.log(metric.name, metric);
        };
        getCLS(logWebVitals);
        getFID(logWebVitals);
        getFCP(logWebVitals);
        getLCP(logWebVitals);
      }
    }).catch((error) => {
      console.error('Error loading web-vitals', error);
    });
  }
};

export default reportWebVitals;
