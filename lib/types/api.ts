export interface Board {
  id: string
  user_id: string
  name: string
  description: string | null
  color: string
  icon: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

export interface CreateBoardRequest {
  name: string
  description?: string
  color?: string
  icon?: string
}

export interface UpdateBoardRequest {
  name?: string
  description?: string
  color?: string
  icon?: string
}

export interface CheckIn {
  id: string
  board_id: string
  user_id: string
  date: string
  completed: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateCheckInRequest {
  date: string
  completed: boolean
  notes?: string
}

export interface UpdateCheckInRequest {
  completed?: boolean
  notes?: string | null
}

export interface ApiError {
  error: string
  message?: string
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}