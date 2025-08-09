export type CloudAuthUser = {
  id: string;
  email?: string;
} | null;

export type User = {
  id: string;
  username: string | null;
  avatar: string;
};

export type Message = {
  id: string;
  text: string;
  createdAt: number;
  userId: string;
  likes: string[];
};

export type ChatDocument = {
  messages: Message[];
  users: User[];
};

// Create an SHA256 hash of a string
export async function sha256(text: string) {
  // Encode the text as a Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  // Use the Web Crypto API to hash the data
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert the hash to a hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return hashHex;
}

export const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat('en-US', {
    timeStyle: 'short',
    dateStyle: 'medium'
  }).format(new Date(timestamp));