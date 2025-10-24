/**
 * Utility functions for handling location data in profile components
 */

/**
 * Check if a location should be displayed to users
 * Filters out test values and empty locations
 */
export const shouldShowLocation = (location: string | undefined): boolean => {
  if (!location) return false;
  
  const trimmedLocation = location.trim();
  if (trimmedLocation === '') return false;
  
  // List of test values that should not be displayed
  const testValues = [
    'test', 'Test', 'TEST',
    'testing', 'Testing', 'TESTING',
    'example', 'Example', 'EXAMPLE',
    'sample', 'Sample', 'SAMPLE',
    'demo', 'Demo', 'DEMO',
    'placeholder', 'Placeholder', 'PLACEHOLDER',
    'temp', 'Temp', 'TEMP',
    'temporary', 'Temporary', 'TEMPORARY'
  ];
  
  return !testValues.includes(trimmedLocation);
};

/**
 * Format location for display
 * Handles common formatting issues
 */
export const formatLocation = (location: string | undefined): string => {
  if (!location || !shouldShowLocation(location)) return '';
  
  return location.trim();
};

/**
 * Get location display component props
 * Returns props for consistent location display across components
 */
export const getLocationDisplayProps = (location: string | undefined) => {
  const shouldShow = shouldShowLocation(location);
  const formattedLocation = formatLocation(location);
  
  return {
    shouldShow,
    formattedLocation,
    isEmpty: !shouldShow
  };
};
