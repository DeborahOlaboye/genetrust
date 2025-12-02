import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const getNestedValue = (obj, path) => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export const setNestedValue = (obj, path, value) => {
  const parts = path.split('.');
  const last = parts.pop();
  const parent = parts.reduce((acc, part) => {
    if (!acc[part]) acc[part] = {};
    return acc[part];
  }, obj);
  parent[last] = value;
  return obj;
};

export const formatFormData = (data) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof File) {
      formData.append(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((item) => formData.append(`${key}[]`, item));
    } else if (value !== null && value !== undefined) {
      formData.append(key, value);
    }
  });
  return formData;
};

export const formatErrors = (error) => {
  if (error.response?.data?.errors) {
    return error.response.data.errors;
  }
  return { _error: error.message || 'An error occurred' };
};
