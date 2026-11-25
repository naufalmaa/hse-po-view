import axios from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'
import { APP_CONFIG } from "@/constants/config";

export const axiosInstance = axios.create({})

// Add interceptor for handling 401 errors globally
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if the request explicitly skips global error handling
    if ((error.config as any)?.skipErrorHandling) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401) {
      const authStore = useAuthStore.getState()
      authStore.logout()

      window.location.href = APP_CONFIG.path.defaultPublic
    }

    return Promise.reject(error)
  }
)

export const fetchApi = async ({
  method,
  url,
  body,
  headers,
  params,
  withCredentials = true,
  skipErrorHandling = false,
}: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  url: string
  body?: any
  headers?: Record<string, string>
  params?: Record<string, any>
  withCredentials?: boolean
  skipErrorHandling?: boolean
}) => {
  try {
    const response = await axiosInstance({
      method,
      url,
      data: body ?? null,
      // headers: headers ?? {},
      headers: {
        'Content-Type': 'application/json',
        ...(headers ?? {}),
      },
      params: params ?? {},
      withCredentials,
      skipErrorHandling
    } as any)
    return response.data
  } catch (error) {
    throw error
  }
}
