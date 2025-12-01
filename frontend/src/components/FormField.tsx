import type { FieldError } from 'react-hook-form'
import type { ReactNode } from 'react'

type BaseInputTypes =
  | 'text'
  | 'number'
  | 'email'
  | 'password'
  | 'date'
  | 'time'
  | 'datetime-local'

type FormFieldType = BaseInputTypes | 'select' | 'textarea'

interface Option {
  label: string
  value: string | number
}

interface FormFieldProps {
  name: string
  label?: string
  type?: FormFieldType
  disabled?: boolean
  placeholder?: string
  className?: string
  error?: FieldError | string
  required?: boolean
  options?: Option[]
  children?: ReactNode
  // Giá trị trả về từ register() của react-hook-form, spread trực tiếp vào input/select
  register?: Record<string, unknown>
  // Hỗ trợ controlled component (không dùng react-hook-form)
  value?: string | number
  onChange?: React.ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >
  onBlur?: React.FocusEventHandler<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >
}

export default function FormField({
  name,
  label,
  type = 'text',
  disabled,
  placeholder,
  className = '',
  error,
  required,
  options,
  children,
  register,
  value,
  onChange,
  onBlur,
}: FormFieldProps) {
  const errorMessage = typeof error === 'string' ? error : error?.message

  const baseInputClass =
    'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 ' +
    (errorMessage ? 'border-red-500' : 'border-gray-300') +
    (disabled ? ' bg-gray-100 cursor-not-allowed' : '')

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {type === 'select' ? (
        <select
          id={name}
          disabled={disabled}
          className={baseInputClass}
          value={value as string | number | undefined}
          onChange={onChange}
          onBlur={onBlur}
          {...register}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
          {children}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          id={name}
          disabled={disabled}
          placeholder={placeholder}
          className={baseInputClass}
          value={value as string | undefined}
          onChange={onChange}
          onBlur={onBlur}
          {...register}
        />
      ) : (
        <input
          id={name}
          type={type}
          disabled={disabled}
          placeholder={placeholder}
          className={baseInputClass}
          value={value as string | number | undefined}
          onChange={onChange}
          onBlur={onBlur}
          {...register}
        />
      )}

      {errorMessage && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  )
}


