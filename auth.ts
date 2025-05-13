import * as bcrypt from 'bcrypt-ts';
import * as jwt from 'jsonwebtoken';

// Define a type for the user object
interface User {
  email: string;
  password?: string; // Password will be stored hashed, might not always be present on User objects in memory
  id?: number; // Optional: if you were to assign an ID from a DB
}

// Placeholder for user data storage (e.g., a database)
const users: User[] = [];

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Store your secret key in environment variables

export async function registerUser(email: string, password: string): Promise<{ message: string; userId: number }> {
  // Check if user already exists
  const existingUser = users.find(user => user.email === email);
  if (existingUser) {
    throw new Error('User already exists');
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Store the new user (in a real application, this would be a database call)
  const newUser: User = { email, password: hashedPassword };
  users.push(newUser);

  return { message: 'User registered successfully', userId: users.length }; // In a real app, return user ID from DB
}

export async function verifyUser(email: string, password: string): Promise<{ message: string; token: string }> {
  // Find the user
  const user = users.find(u => u.email === email);
  if (!user) {
    throw new Error('User not found');
  }

  // Compare the provided password with the stored hashed password
  const isMatch = await bcrypt.compare(password, user.password!);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  // Ensure user and user.email exist before signing
  if (!user.email) { // Should not happen if user is found and has an email, but good for type safety
    throw new Error('User email is missing');
  }
  // Generate a JWT
  const token = jwt.sign({ userId: user.email }, JWT_SECRET, { expiresIn: '1h' }); // Adjust user identifier and expiration as needed

  return { message: 'User verified successfully', token };
}
