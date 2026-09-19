import { useState, type ChangeEvent, type FormEvent } from 'react';

export function useForm<T extends Record<string, string>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof T]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (onSubmit: (values: T) => Promise<void>) => {
    return async (e: FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setErrors({ form: err.message } as Partial<Record<keyof T, string>>);
        }
      } finally {
        setIsSubmitting(false);
      }
    };
  };

  return { values, errors, setErrors, isSubmitting, handleChange, handleSubmit };
}
