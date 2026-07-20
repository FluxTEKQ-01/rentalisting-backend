import { User } from '../models/User.js';
import { Property } from '../models/Property.js';
import { hashPassword } from './password.js';

export async function seedDatabase(): Promise<void> {
  try {
    const adminExists = await User.findOne({ email: 'admin@rentalisting.com' });
    if (adminExists) {
      console.log('Database already has seed users. Skipping seeding.');
      return;
    }

    console.log('Seeding database with default users and properties...');

    // 1. Create Hashed Passwords
    const hashedPassword = await hashPassword('password');

    // 2. Create Users
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@rentalisting.com',
      mobile: '1234567890',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
    });

    const ownerUser = await User.create({
      name: 'Owner User',
      email: 'owner@rentalisting.com',
      mobile: '0987654321',
      password: hashedPassword,
      role: 'owner',
      isActive: true,
    });

    const visitorUser = await User.create({
      name: 'Visitor User',
      email: 'visitor@rentalisting.com',
      mobile: '5555555555',
      password: hashedPassword,
      role: 'visitor',
      isActive: true,
    });

    console.log('Default users created successfully:');
    console.log('- Admin: admin@rentalisting.com / password');
    console.log('- Owner: owner@rentalisting.com / password');
    console.log('- Visitor: visitor@rentalisting.com / password');

    // 3. Create Properties
    const propertiesData = [
      {
        title: 'Premium 3 BHK Apartment in Indiranagar',
        description: 'Luxurious 3 bedroom apartment situated in the heart of Indiranagar. Fully furnished with modern amenities, modular kitchen, and private balcony. Located near major restaurants, shops, and metro station.',
        propertyType: 'house_apartment',
        price: 45000,
        currency: 'INR',
        bedrooms: 3,
        bathrooms: 3,
        area: 1800,
        areaUnit: 'sqft',
        amenities: ['Power Backup', 'Lift', 'Gym', 'Car Parking', '24/7 Security', 'Swimming Pool'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&h=800&q=80',
            publicId: 'mock_p1_1',
          },
          {
            url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&h=800&q=80',
            publicId: 'mock_p1_2',
          },
        ],
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        location: {
          address: '12th Main Road, Indiranagar',
          city: 'Bengaluru',
          state: 'Karnataka',
          zipCode: '560038',
          coordinates: { lat: 12.9716, lng: 77.5946 },
        },
        owner: ownerUser._id,
        status: 'published',
      },
      {
        title: 'Elegant Villa in Whitefield Sanctuary',
        description: 'Spacious independent 4 BHK villa located inside a gated community in Whitefield. Private garden, servant room, modular kitchen, and Italian marble flooring. Ideal for corporate families.',
        propertyType: 'villa',
        price: 85000,
        currency: 'INR',
        bedrooms: 4,
        bathrooms: 4,
        area: 3200,
        areaUnit: 'sqft',
        amenities: ['Private Garden', 'Gated Community', 'Club House', 'Gym', 'Jogging Track', 'Tennis Court'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&h=800&q=80',
            publicId: 'mock_p2_1',
          },
        ],
        videoUrl: '',
        location: {
          address: 'EPIP Zone, Whitefield',
          city: 'Bengaluru',
          state: 'Karnataka',
          zipCode: '560066',
          coordinates: { lat: 12.9698, lng: 77.75 },
        },
        owner: ownerUser._id,
        status: 'published',
      },
      {
        title: 'Cozy 1 BHK PG/Hostel near Koramangala',
        description: 'Single occupancy fully-serviced room near Koramangala 4th block. Includes high-speed Wi-Fi, 3 meals daily, laundry services, and daily housekeeping. Best suited for working professionals and students.',
        propertyType: 'coworking',
        price: 12000,
        currency: 'INR',
        bedrooms: 1,
        bathrooms: 1,
        area: 350,
        areaUnit: 'sqft',
        amenities: ['High Speed Wi-Fi', 'Laundromat', 'Housekeeping', 'Food Included', 'AC'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&h=800&q=80',
            publicId: 'mock_p3_1',
          },
        ],
        videoUrl: '',
        location: {
          address: '80 Feet Road, Koramangala',
          city: 'Bengaluru',
          state: 'Karnataka',
          zipCode: '560034',
          coordinates: { lat: 12.9352, lng: 77.6244 },
        },
        owner: ownerUser._id,
        status: 'published',
      },
      {
        title: 'Modern Office Space in HSR Layout',
        description: 'Fully furnished commercial office space with 20 workstations, 2 cabins, conference room, and pantry. Located on main Outer Ring Road in HSR Layout. Excellent connectivity and parking spaces.',
        propertyType: 'office',
        price: 110000,
        currency: 'INR',
        bedrooms: 0,
        bathrooms: 2,
        area: 2100,
        areaUnit: 'sqft',
        amenities: ['Central Air Conditioning', 'Conference Room', 'Pantry', 'Server Room', 'Fiber Optic Internet'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&h=800&q=80',
            publicId: 'mock_p4_1',
          },
        ],
        videoUrl: '',
        location: {
          address: 'Sector 6, HSR Layout',
          city: 'Bengaluru',
          state: 'Karnataka',
          zipCode: '560102',
          coordinates: { lat: 12.9141, lng: 77.6413 },
        },
        owner: ownerUser._id,
        status: 'published',
      },
    ];

    await Property.create(propertiesData);
    console.log('Mock properties seeded successfully!');
  } catch (error) {
    console.error('Failed to seed database:', error);
  }
}
