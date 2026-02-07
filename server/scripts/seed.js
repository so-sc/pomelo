require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Question = require('../models/Question');
const Contest = require('../models/Contest');
const Submission = require('../models/Submissions');
const bcrypt = require('bcryptjs');

// Database connection
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    console.log(`Connecting to MongoDB at: ${uri}`);
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const hashPassword = (password) => bcrypt.hashSync(password, 10);

// Seed data for Users (FIXED - DO NOT MODIFY)
const users = [
  {
    email: 'admin@example.com',
    passwordHash: hashPassword('admin123'),
    name: 'Admin User',
    role: 'admin',
    registeredContests: [],
  },
  {
    email: 'user@example.com',
    passwordHash: hashPassword('user123'),
    name: 'Regular User',
    role: 'user',
    registeredContests: [],
  },
];

// Seed data for Questions
const questions = [
  // MCQ Questions
  {
    type: 'mcq',
    title: 'What is the time complexity of binary search?',
    description: 'Binary search is a searching algorithm that finds the position of a target value within a sorted array.',
    difficulty: 'Easy',
    marks: 10,
    questionType: 'Single Correct',
    options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
    correctAnswer: '1',
  },
  {
    type: 'mcq',
    title: 'Which data structures use LIFO principle?',
    description: 'Select all data structures that follow Last In First Out principle.',
    difficulty: 'Easy',
    marks: 15,
    questionType: 'Multiple Correct',
    options: ['Stack', 'Queue', 'Deque (when used as stack)', 'Linked List'],
    correctAnswer: '0,2',
  },
  {
    type: 'mcq',
    title: 'What is the output of console.log(typeof NaN)?',
    description: 'Understanding JavaScript types and NaN behavior.',
    difficulty: 'Medium',
    marks: 10,
    questionType: 'Single Correct',
    options: ['NaN', 'number', 'undefined', 'object'],
    correctAnswer: '1',
  },
  // Coding Questions
  {
    type: 'coding',
    title: 'Two Sum',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    difficulty: 'Easy',
    marks: 30,
    constraints: '2 <= nums.length <= 10^4',
    inputFormat: 'First line contains n (size of array) and target. Second line contains n space-separated integers',
    outputFormat: 'Two space-separated integers representing the indices',
    functionName: 'twoSum',
    inputVariables: [
      { variable: 'nums', type: 'int_array' },
      { variable: 'target', type: 'int' }
    ],
    boilerplateCode: {
      python: `def twoSum(nums, target):\n    # Write your code here\n    pass`,
      c: `void twoSum(int* nums, int nums_size, int target) {\n    // Write your code here\n    printf("Output goes here\\n");\n}`,
      java: `class Code {\n    public static void twoSum(int[] nums, int target) {\n        // Write your code here\n        System.out.println("Output goes here");\n    }\n}`,
    },
    testcases: [
      {
        input: '4 2 7 11 15 9',
        output: '0 1'
      },
      {
        input: '3 3 2 4 6',
        output: '1 2'
      },
      {
        input: '2 3 3 6',
        output: '0 1'
      }
    ],
  },
  {
    type: 'coding',
    title: 'Palindrome Number',
    description: 'Given an integer x, return true if x is a palindrome, and false otherwise.',
    difficulty: 'Easy',
    marks: 25,
    constraints: '-2^31 <= x <= 2^31 - 1',
    inputFormat: 'A single integer x',
    outputFormat: 'true or false',
    functionName: 'isPalindrome',
    inputVariables: [
      { variable: 'x', type: 'int' }
    ],
    boilerplateCode: {
      python: `def isPalindrome(x):\n    # Write your code here\n    pass`,
      c: `void isPalindrome(int x) {\n    // Write your code here\n    printf("Output goes here\\n");\n}`,
      java: `class Code {\n    public static void isPalindrome(int x) {\n        // Write your code here\n        System.out.println("Output goes here");\n    }\n}`,
    },
    testcases: [
      {
        input: '121',
        output: 'true'
      },
      {
        input: '-121',
        output: 'false'
      },
      {
        input: '10',
        output: 'false'
      }
    ],
  },
];

// Main seed function
const seedDatabase = async () => {
  try {
    console.log('Starting database seed...');

    // Clear existing data
    console.log('Clearing existing data...');
    await mongoose.connection.db.dropDatabase();
    console.log('Database dropped.');

    // Seed Users
    console.log('Seeding users...');
    const createdUsers = await User.insertMany(users);
    console.log(`${createdUsers.length} users created.`);

    // Get admin user for contest author
    const adminUser = createdUsers.find(u => u.role === 'admin');
    const regularUser = createdUsers.find(u => u.role === 'user');

    // Seed Questions
    console.log('Seeding questions...');
    const createdQuestions = await Question.insertMany(questions);
    console.log(`${createdQuestions.length} questions created.`);

    // Categorize questions
    const mcqQuestions = createdQuestions.filter(q => q.type === 'mcq');
    const codingQuestions = createdQuestions.filter(q => q.type === 'coding');

    // Seed Contests
    console.log('Seeding contests...');
    const now = new Date();
    const contests = [
      {
        title: 'Beginner Programming Contest',
        description: 'A contest for beginners to test their basic programming skills.',
        joinId: '123456',
        startTime: new Date(now.getTime() - 60 * 60 * 1000), // Started 1 hour ago
        endTime: new Date(now.getTime() + 2 * 60 * 60 * 1000), // Ends in 2 hours
        questions: codingQuestions.map(q => q._id.toString()),
        author: adminUser._id.toString(),
        rules: ['No plagiarism allowed', 'Time limit: 3 hours'],
      },
      {
        title: 'Quick MCQ Quiz',
        description: 'A rapid-fire MCQ quiz covering computer science fundamentals.',
        joinId: '654321',
        startTime: new Date(now.getTime() - 30 * 60 * 1000), // Started 30 minutes ago
        endTime: new Date(now.getTime() + 30 * 60 * 1000), // Ends in 30 minutes
        questions: mcqQuestions.map(q => q._id.toString()),
        author: adminUser._id.toString(),
        rules: ['Single attempt only', 'No negative marking'],
      },
    ];

    const createdContests = await Contest.insertMany(contests);
    console.log(`${createdContests.length} contests created.`);

    // Update user with registered contests
    console.log('Updating user registrations...');
    await User.findByIdAndUpdate(regularUser._id, {
      registeredContests: createdContests.map(c => c._id),
    });
    console.log('User registrations updated.');

    // Seed sample submissions
    console.log('Seeding submissions...');
    const submissions = [
      {
        contest: createdContests[0]._id,
        user: regularUser._id,
        startedAt: new Date('2026-01-10T10:05:00Z'),
        submittedAt: new Date('2026-01-10T12:30:00Z'),
        status: 'Completed',
        totalScore: 30,
        submissions: [
          {
            question: codingQuestions[0]._id,
            answer: ['def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        if target - num in seen:\n            return [seen[target - num], i]\n        seen[num] = i'],
            language: 'python',
            status: 'Accepted',
            testCaseResults: [
              { testCase: 1, passed: true, input: '4 9\n2 7 11 15', expectedOutput: '0 1', actualOutput: '0 1' },
              { testCase: 2, passed: true, input: '3 6\n3 2 4', expectedOutput: '1 2', actualOutput: '1 2' },
            ],
            executionTime: 45,
            memoryUsed: 2048,
            score: 30,
            submittedAt: new Date('2026-01-10T11:00:00Z'),
          },
        ],
      },
    ];

    const createdSubmissions = await Submission.insertMany(submissions);
    console.log(`${createdSubmissions.length} submissions created.`);

    console.log('\\n✅ Database seeded successfully!');
    console.log('\\n📊 Summary:');
    console.log(`   Users: ${createdUsers.length}`);
    console.log(`   Questions: ${createdQuestions.length} (${mcqQuestions.length} MCQ, ${codingQuestions.length} Coding)`);
    console.log(`   Contests: ${createdContests.length}`);
    console.log(`   Submissions: ${createdSubmissions.length}`);
    console.log('\\n🔐 Admin credentials:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Password: admin123`);
    console.log('\\n🔐 User credentials:');
    console.log(`   Email: ${regularUser.email}`);
    console.log(`   Password: user123`);

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

// Run the seed
connectDB().then(() => {
  seedDatabase()
    .then(() => {
      console.log('\\n✨ Seeding completed. Disconnecting...');
      mongoose.connection.close();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      mongoose.connection.close();
      process.exit(1);
    });
});
