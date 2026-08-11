import { userRepository } from '../repositories/userRepository.js';
import { propertyRepository } from '../repositories/propertyRepository.js';
import { hashPassword } from './password.js';

export async function seedDatabase(): Promise<void> {
  try {
    // Check if admin already exists in Supabase
    const adminExists = await userRepository.findOne({ email: 'admin@rentalisting.com' });
    if (adminExists) {
      console.log('Database already has seed users. Skipping seeding.');
      return;
    }

    console.log('Seeding Supabase with default users and properties...');

    // 1. Create Hashed Passwords
    const hashedPassword = await hashPassword('password');

    // 2. Create Users in Supabase
    const adminUser = await userRepository.create({
      name: 'Admin User',
      email: 'admin@rentalisting.com',
      mobile: '1234567890',
      password: hashedPassword,
      role: 'admin',
    });

    const ownerUser = await userRepository.create({
      name: 'Owner User',
      email: 'owner@rentalisting.com',
      mobile: '0987654321',
      password: hashedPassword,
      role: 'owner',
    });

    console.log('Default users created successfully:');
    console.log('- Admin: admin@rentalisting.com / password');
    console.log('- Owner: owner@rentalisting.com / password');

    // 3. Create Properties in Supabase
    const propertiesData = [
      {
        title: 'Premium 3 BHK Apartment in Indiranagar',
        description: 'Luxurious 3 bedroom apartment situated in the heart of Indiranagar. Fully furnished with modern amenities, modular kitchen, and private balcony. Located near major restaurants, shops, and metro station.',
        propertyType: 'house_apartment',
        price: 45000,
        bedrooms: 3,
        bathrooms: 3,
        area: 1800,
        address: '12th Main Road, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560038',
        lat: 12.9716,
        lng: 77.5946,
        owner_id: ownerUser.id,
        status: 'published',
      },
      {
        title: 'Elegant Villa in Whitefield Sanctuary',
        description: 'Spacious independent 4 BHK villa located inside a gated community in Whitefield. Private garden, servant room, modular kitchen, and Italian marble flooring. Ideal for corporate families.',
        propertyType: 'villa',
        price: 85000,
        bedrooms: 4,
        bathrooms: 4,
        area: 3200,
        address: 'EPIP Zone, Whitefield',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560066',
        lat: 12.9698,
        lng: 77.75,
        owner_id: ownerUser.id,
        status: 'published',
      },
      {
        title: 'Cozy 1 BHK PG/Hostel near Koramangala',
        description: 'Single occupancy fully-serviced room near Koramangala 4th block. Includes high-speed Wi-Fi, 3 meals daily, laundry services, and daily housekeeping. Best suited for working professionals and students.',
        propertyType: 'coworking',
        price: 12000,
        bedrooms: 1,
        bathrooms: 1,
        area: 350,
        address: '80 Feet Road, Koramangala',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560034',
        lat: 12.9352,
        lng: 77.6244,
        owner_id: ownerUser.id,
        status: 'published',
      },
      {
        title: 'Modern Office Space in HSR Layout',
        description: 'Fully furnished commercial office space with 20 workstations, 2 cabins, conference room, and pantry. Located on main Outer Ring Road in HSR Layout. Excellent connectivity and parking spaces.',
        propertyType: 'office',
        price: 110000,
        bedrooms: 0,
        bathrooms: 2,
        area: 2100,
        address: 'Sector 6, HSR Layout',
        city: 'Bengaluru',
        state: 'Karnataka',
        zipCode: '560102',
        lat: 12.9141,
        lng: 77.6413,
        owner_id: ownerUser.id,
        status: 'published',
      },
    ];

    for (const propData of propertiesData) {
      await propertyRepository.create(propData);
    }
    console.log('Mock properties seeded successfully!');
  } catch (error) {
    console.error('Failed to seed database:', error);
  }
}
