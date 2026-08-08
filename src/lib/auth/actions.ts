'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUp(
  fullName: string,
  email: string,
  password: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  if (!data.user) {
    return {
      success: false,
      error: 'Unable to create account.',
    }
  }

  return {
    success: true,
    error: null,
  }
}

export async function signIn(
  email: string,
  password: string
) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()

  await supabase.auth.signOut()

  redirect('/auth/login')
}