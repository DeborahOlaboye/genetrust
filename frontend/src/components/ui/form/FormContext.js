import { createContext, useContext } from 'react';
import { useForm as useReactHookForm } from 'react-hook-form';

const FormContext = createContext(null);

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
};

export const FormProvider = ({ children, ...props }) => {
  const methods = useReactHookForm(props);
  return (
    <FormContext.Provider value={methods}>
      {children}
    </FormContext.Provider>
  );
};
