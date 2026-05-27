import { supabase } from './supabase';

export async function sendChatMessage(message, attachments = null) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      message,
      attachments,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Chat request failed' }));
    throw new Error(error.error || 'Chat request failed');
  }

  return response.json();
}

export async function fetchChatHistory(limit = 50) {
  const { data, error } = await supabase
    .from('trip_chat')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching chat history:', error);
    throw error;
  }

  return data || [];
}

export async function uploadChatAttachment(file) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('chat-attachments')
    .upload(fileName, file);

  if (uploadError) {
    throw new Error('Failed to upload attachment');
  }

  return {
    name: file.name,
    storage_path: fileName,
    type: file.type,
  };
}
