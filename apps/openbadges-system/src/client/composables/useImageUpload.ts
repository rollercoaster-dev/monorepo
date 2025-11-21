import { ref } from 'vue'

export interface ImageUploadOptions {
  maxSize?: number // in bytes
  allowedTypes?: string[]
  quality?: number // for JPEG compression (0-1)
}

export interface ImageUploadResult {
  dataUrl: string
  file: globalThis.File
  width: number
  height: number
}

export const useImageUpload = (options: ImageUploadOptions = {}) => {
  const {
    maxSize = 2 * 1024 * 1024, // 2MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    quality = 0.8,
  } = options

  const isUploading = ref(false)
  const error = ref<string | null>(null)
  const progress = ref(0)

  // Validate file
  const validateFile = (file: globalThis.File): boolean => {
    error.value = null

    if (!allowedTypes.includes(file.type)) {
      error.value = `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      return false
    }

    if (file.size > maxSize) {
      error.value = `File size too large. Maximum size: ${(maxSize / 1024 / 1024).toFixed(1)}MB`
      return false
    }

    return true
  }

  // Resize image if needed
  const resizeImage = (
    file: globalThis.File,
    maxWidth = 512,
    maxHeight = 512
  ): Promise<ImageUploadResult> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new globalThis.Image()

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          blob => {
            if (blob) {
              const reader = new globalThis.FileReader()
              reader.onload = e => {
                resolve({
                  dataUrl: e.target?.result as string,
                  file: new globalThis.File([blob], file.name, { type: file.type }),
                  width,
                  height,
                })
              }
              reader.readAsDataURL(blob)
            } else {
              reject(new Error('Failed to compress image'))
            }
          },
          file.type,
          quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  // Upload image and return data URL
  const uploadImage = async (file: globalThis.File): Promise<ImageUploadResult | null> => {
    if (!validateFile(file)) return null

    isUploading.value = true
    progress.value = 0

    try {
      // Simulate upload progress
      const progressInterval = globalThis.setInterval(() => {
        progress.value = Math.min(progress.value + 20, 90)
      }, 100)

      const result = await resizeImage(file)

      globalThis.clearInterval(progressInterval)
      progress.value = 100

      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Upload failed'
      return null
    } finally {
      isUploading.value = false
      setTimeout(() => {
        progress.value = 0
      }, 1000)
    }
  }

  // Handle file input change
  const handleFileChange = async (event: Event): Promise<ImageUploadResult | null> => {
    const target = event.target as globalThis.HTMLInputElement
    const file = target.files?.[0]

    if (!file) return null

    return uploadImage(file)
  }

  // Handle drag and drop
  const handleDrop = async (event: globalThis.DragEvent): Promise<ImageUploadResult | null> => {
    event.preventDefault()
    const file = event.dataTransfer?.files[0]

    if (!file) return null

    return uploadImage(file)
  }

  // Clear error
  const clearError = () => {
    error.value = null
  }

  return {
    isUploading,
    error,
    progress,
    uploadImage,
    handleFileChange,
    handleDrop,
    clearError,
  }
}
