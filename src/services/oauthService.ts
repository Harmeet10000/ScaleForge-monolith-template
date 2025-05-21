import { Profile } from 'passport-google-oauth20';
import { IUserDocument } from '../types/userTypes.js';
import { findUserByGoogleId, findUserByEmailAddress } from '../repository/authRepository.js';
import { User } from '../models/userModel.js'; // Import User model

export const findOrCreateUser = async (profile: Profile): Promise<IUserDocument> => {
  let user = await findUserByGoogleId(profile.id);

  if (!user) {
    const userEmail = profile.emails?.[0]?.value;
    if (!userEmail) {
      throw new Error('Email not found in Google profile.');
    }
    // Check if a user with the same email already exists
    const existingUserWithEmail = await findUserByEmailAddress(userEmail);

    if (existingUserWithEmail) {
      // Link Google ID to existing user
      // Ensure the model/type supports these fields or handle appropriately
      (existingUserWithEmail as any).googleId = profile.id;
      (existingUserWithEmail as any).avatar = profile.photos?.[0]?.value;
      // Potentially update other fields like name if desired
      if (profile.displayName && !existingUserWithEmail.name) {
        existingUserWithEmail.name = profile.displayName;
      }
      user = await existingUserWithEmail.save();
    } else {
      // Create a new user
      // Ensure the model/type supports these fields or handle appropriately
      user = await User.create({
        googleId: profile.id,
        emailAddress: userEmail,
        name: profile.displayName,
        avatar: profile.photos?.[0]?.value,
        isEmailVerified: true // Google already verified the email
        // You might want to set a default role or other fields here
      });
    }
  }
  if (!user) {
    // This case should ideally not be reached if logic above is correct
    throw new Error('User could not be found or created.');
  }
  return user;
};
