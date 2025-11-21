import { ref, computed } from 'vue'

export interface ValidationRule {
  validate: (value: string) => boolean
  message: string
}

export interface FieldValidation {
  value: string
  rules: ValidationRule[]
  touched: boolean
  error: string
}

export const useFormValidation = () => {
  const fields = ref<Record<string, FieldValidation>>({})

  // Validation rules
  const rules = {
    required: (message = 'This field is required'): ValidationRule => ({
      validate: (value: string) => value.trim().length > 0,
      message,
    }),

    email: (message = 'Please enter a valid email address'): ValidationRule => ({
      validate: (value: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(value)
      },
      message,
    }),

    url: (message = 'Please enter a valid URL'): ValidationRule => ({
      validate: (value: string) => {
        const v = value.trim()
        if (v === '') return true // allow empty for optional fields
        try {
          const u = new URL(v)
          return u.protocol === 'http:' || u.protocol === 'https:'
        } catch {
          return false
        }
      },
      message,
    }),

    minLength: (min: number, message?: string): ValidationRule => ({
      validate: (value: string) => value.length >= min,
      message: message || `Must be at least ${min} characters`,
    }),

    maxLength: (max: number, message?: string): ValidationRule => ({
      validate: (value: string) => value.length <= max,
      message: message || `Must be no more than ${max} characters`,
    }),

    password: (
      message = 'Password must be at least 8 characters with uppercase, lowercase, and number'
    ): ValidationRule => ({
      validate: (value: string) => {
        const hasUppercase = /[A-Z]/.test(value)
        const hasLowercase = /[a-z]/.test(value)
        const hasNumber = /\d/.test(value)
        const hasMinLength = value.length >= 8
        return hasUppercase && hasLowercase && hasNumber && hasMinLength
      },
      message,
    }),

    confirmPassword: (
      originalPassword: string,
      message = 'Passwords do not match'
    ): ValidationRule => ({
      validate: (value: string) => value === originalPassword,
      message,
    }),

    username: (
      message = 'Username must be 3-20 characters, letters, numbers, and underscores only'
    ): ValidationRule => ({
      validate: (value: string) => {
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
        return usernameRegex.test(value)
      },
      message,
    }),
  }

  // Create a field
  const createField = (name: string, initialValue = '', validationRules: ValidationRule[] = []) => {
    fields.value[name] = {
      value: initialValue,
      rules: validationRules,
      touched: false,
      error: '',
    }
  }

  // Update field value
  const updateField = (name: string, value: string) => {
    if (fields.value[name]) {
      fields.value[name].value = value
      if (fields.value[name].touched) {
        validateField(name)
      }
    }
  }

  // Mark field as touched
  const touchField = (name: string) => {
    const field = fields.value[name]
    if (field) {
      field.touched = true
      validateField(name)
    }
  }

  // Validate a specific field
  const validateField = (name: string) => {
    const field = fields.value[name]
    if (!field) return true

    for (const rule of field.rules) {
      if (!rule.validate(field.value)) {
        field.error = rule.message
        return false
      }
    }

    field.error = ''
    return true
  }

  // Validate all fields
  const validateAll = () => {
    let isValid = true

    for (const name in fields.value) {
      const field = fields.value[name]
      if (field) {
        field.touched = true
        if (!validateField(name)) {
          isValid = false
        }
      }
    }

    return isValid
  }

  // Reset form
  const resetForm = () => {
    for (const name in fields.value) {
      const field = fields.value[name]
      if (field) {
        field.value = ''
        field.touched = false
        field.error = ''
      }
    }
  }

  // Check if form is valid
  const isFormValid = computed(() => {
    return Object.values(fields.value).every(
      field => field.rules.every(rule => rule.validate(field.value)) && field.error === ''
    )
  })

  // Check if form has errors
  const hasErrors = computed(() => {
    return Object.values(fields.value).some(field => field.error !== '')
  })

  // Get field error
  const getFieldError = (name: string) => {
    return fields.value[name]?.error || ''
  }

  // Get field value
  const getFieldValue = (name: string) => {
    return fields.value[name]?.value || ''
  }

  // Check if field is touched
  const isFieldTouched = (name: string) => {
    return fields.value[name]?.touched || false
  }

  return {
    fields,
    rules,
    createField,
    updateField,
    touchField,
    validateField,
    validateAll,
    resetForm,
    isFormValid,
    hasErrors,
    getFieldError,
    getFieldValue,
    isFieldTouched,
  }
}
