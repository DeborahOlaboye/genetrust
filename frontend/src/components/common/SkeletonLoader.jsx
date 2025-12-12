import PropTypes from 'prop-types';

const SkeletonLoader = ({ 
  width = '100%', 
  height = '1rem', 
  className = '',
  count = 1,
  circle = false,
  rounded = 'md'
}) => {
  const elements = [];
  
  for (let i = 0; i < count; i++) {
    elements.push(
      <div
        key={i}
        className={`bg-gray-200 dark:bg-gray-700 animate-pulse ${className} ${circle ? 'rounded-full' : `rounded-${rounded}`}`}
        style={{
          width,
          height: circle ? width : height,
          marginBottom: i < count - 1 ? '0.5rem' : 0
        }}
        aria-hidden="true"
      />
    );
  }

  return <>{elements}</>;
};

SkeletonLoader.propTypes = {
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  className: PropTypes.string,
  count: PropTypes.number,
  circle: PropTypes.bool,
  rounded: PropTypes.oneOf(['none', 'sm', 'md', 'lg', 'full'])
};

export default SkeletonLoader;
