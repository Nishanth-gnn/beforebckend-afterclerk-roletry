
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  try {
    // Get the request body
    const body = await req.json()
    const { type, data } = body

    console.log(`Received webhook: ${type}`)

    // Handle user creation in Clerk
    if (type === 'user.created' || type === 'user.updated') {
      const { id: clerkId, email_addresses, ...userData } = data

      if (!email_addresses || email_addresses.length === 0) {
        return new Response(JSON.stringify({ error: 'No email address provided' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        })
      }

      const primaryEmail = email_addresses.find(email => email.id === data.primary_email_address_id)
      if (!primaryEmail) {
        return new Response(JSON.stringify({ error: 'No primary email found' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        })
      }

      // Check if user already exists in profiles
      const { data: existingUser, error: queryError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', primaryEmail.email_address)
        .maybeSingle()

      if (queryError) {
        console.error('Error querying user:', queryError)
        return new Response(JSON.stringify({ error: 'Database query error' }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        })
      }

      if (existingUser) {
        console.log(`User already exists: ${primaryEmail.email_address}`)
        // Update user with latest Clerk data if needed
        return new Response(JSON.stringify({ message: 'User already exists' }), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        })
      }

      // If user doesn't exist, create a new profile
      // Generate UUID for the new user
      const { data: uuid, error: uuidError } = await supabase.rpc('gen_random_uuid')
      
      if (uuidError) {
        console.error('Error generating UUID:', uuidError)
        return new Response(JSON.stringify({ error: 'UUID generation error' }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' } 
        })
      }
      
      // Insert new user with generated UUID
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: uuid,
          email: primaryEmail.email_address,
          role: 'patient', // Default role
        })

      if (insertError) {
        console.error('Error inserting user:', insertError)
        return new Response(JSON.stringify({ error: 'Database insertion error' }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        })
      }

      // Create patient data entry
      const { error: patientError } = await supabase
        .from('patient_data')
        .insert({
          user_id: uuid
        })

      if (patientError) {
        console.error('Error creating patient data:', patientError)
        // Non-critical error, continue
      }

      return new Response(JSON.stringify({ message: 'User created successfully' }), { 
        status: 201, 
        headers: { 'Content-Type': 'application/json' } 
      })
    }

    // For other webhook types, return success
    return new Response(JSON.stringify({ message: 'Webhook processed' }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    })
  }
})
