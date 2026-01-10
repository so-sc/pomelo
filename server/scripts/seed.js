const mongoose = require('mongoose');
const User = require('../models/User');
const Question = require('../models/Question');
const Contest = require('../models/Contest');
const Submission = require('../models/Submissions');
const bcrypt = require('bcryptjs');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scem-evman', {
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
    boilerplateCode: {
      python: `def twoSum(nums, target):\n    # Write your code here\n    pass\n\nif __name__ == "__main__":\n    n, target = map(int, input().split())\n    nums = list(map(int, input().split()))\n    result = twoSum(nums, target)\n    print(result[0], result[1])`,
      javascript: `function twoSum(nums, target) {\n    // Write your code here\n}\n\nconst readline = require('readline');\nconst rl = readline.createInterface({\n    input: process.stdin,\n    output: process.stdout\n});\n\nlet input = [];\nrl.on('line', (line) => {\n    input.push(line);\n}).on('close', () => {\n    const [n, target] = input[0].split(' ').map(Number);\n    const nums = input[1].split(' ').map(Number);\n    const result = twoSum(nums, target);\n    console.log(result[0] + ' ' + result[1]);\n});`,
    },
    testcases: [
      { input: '4 9\n2 7 11 15', output: '0 1' },
      { input: '3 6\n3 2 4', output: '1 2' },
      { input: '2 6\n3 3', output: '0 1' },
      { input: '5 10\n1 5 3 7 9', output: '1 3' },
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
    boilerplateCode: {
      python: `def isPalindrome(x):\n    # Write your code here\n    pass\n\nif __name__ == "__main__":\n    x = int(input())\n    print("true" if isPalindrome(x) else "false")`,
    },
    testcases: [
      { input: '121', output: 'true' },
      { input: '-121', output: 'false' },
      { input: '10', output: 'false' },
      { input: '0', output: 'true' },
      { input: '12321', output: 'true' },
    ],
  },
  {
    type: 'coding',
    title: 'Longest Substring Without Repeating Characters',
    description: `Given a string s, find the length of the longest substring without repeating characters.

Example 1:
Input: s = "abcabcbb"
Output: 3
Explanation: The answer is "abc", with the length of 3.

Example 2:
Input: s = "bbbbb"
Output: 1
Explanation: The answer is "b", with the length of 1.

Example 3:
Input: s = "pwwkew"
Output: 3
Explanation: The answer is "wke", with the length of 3.
Notice that the answer must be a substring, "pwke" is a subsequence and not a substring.`,
    difficulty: 'Medium',
    marks: 40,
    constraints:
      '0 <= s.length <= 5 * 10^4, s consists of English letters / digits / symbols / spaces.',
    inputFormat: 'A single string s',
    outputFormat: 'An integer representing the length of longest substring',
    boilerplateCode: {
      cpp: `#include <iostream>
#include <string>
using namespace std;

int lengthOfLongestSubstring(string s) {
    // Write your code here
    
}

int main() {
    string s;
    getline(cin, s);
    cout << lengthOfLongestSubstring(s) << endl;
    return 0;
}`,
      python: `def lengthOfLongestSubstring(s):
    # Write your code here
    pass

if __name__ == "__main__":
    s = input()
    print(lengthOfLongestSubstring(s))`,
      java: `import java.util.*;

public class Solution {
    public static int lengthOfLongestSubstring(String s) {
        // Write your code here
        
    }
    
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.nextLine();
        System.out.println(lengthOfLongestSubstring(s));
    }
}`,
      javascript: `function lengthOfLongestSubstring(s) {
    // Write your code here
    
}

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (line) => {
    console.log(lengthOfLongestSubstring(line));
    rl.close();
});`,
      c: `#include <stdio.h>
#include <string.h>

int lengthOfLongestSubstring(char* s) {
    // Write your code here
    
}

int main() {
    char s[50001];
    fgets(s, 50001, stdin);
    s[strcspn(s, "\\n")] = 0;
    printf("%d\\n", lengthOfLongestSubstring(s));
    return 0;
}`,
    },
    testcases: [
      { input: 'abcabcbb', output: '3' },
      { input: 'bbbbb', output: '1' },
      { input: 'pwwkew', output: '3' },
      { input: ' ', output: '0' },
      { input: 'dvdf', output: '3' },
    ],
  },
  {
    type: 'coding',
    title: 'Merge K Sorted Lists',
    description: `You are given an array of k linked-lists lists, each linked-list is sorted in ascending order.

Merge all the linked-lists into one sorted linked-list and return it.

For this problem, we'll simplify by using arrays instead of linked lists.

Example 1:
Input: lists = [[1,4,5],[1,3,4],[2,6]]
Output: [1,1,2,3,4,4,5,6]

Example 2:
Input: lists = []
Output: []

Example 3:
Input: lists = [[]]
Output: []`,
    difficulty: 'Hard',
    marks: 50,
    constraints:
      'k == lists.length, 0 <= k <= 10^4, 0 <= lists[i].length <= 500, -10^4 <= lists[i][j] <= 10^4, each lists[i] is sorted in ascending order.',
    inputFormat: 'First line contains k (number of lists)\nNext k lines contain space-separated integers for each list',
    outputFormat: 'Space-separated integers representing the merged sorted list',
    boilerplateCode: {
      cpp: `#include <iostream>
#include <vector>
#include <sstream>
using namespace std;

vector<int> mergeKLists(vector<vector<int>>& lists) {
    // Write your code here
    
}

int main() {
    int k;
    cin >> k;
    cin.ignore();
    vector<vector<int>> lists(k);
    for(int i = 0; i < k; i++) {
        string line;
        getline(cin, line);
        stringstream ss(line);
        int num;
        while(ss >> num) {
            lists[i].push_back(num);
        }
    }
    vector<int> result = mergeKLists(lists);
    for(int i = 0; i < result.size(); i++) {
        cout << result[i];
        if(i < result.size() - 1) cout << " ";
    }
    cout << endl;
    return 0;
}`,
      python: `def mergeKLists(lists):
    # Write your code here
    pass

if __name__ == "__main__":
    k = int(input())
    lists = []
    for _ in range(k):
        line = input().strip()
        if line:
            lists.append(list(map(int, line.split())))
        else:
            lists.append([])
    result = mergeKLists(lists)
    print(' '.join(map(str, result)))`,
      java: `import java.util.*;

public class Solution {
    public static List<Integer> mergeKLists(List<List<Integer>> lists) {
        // Write your code here
        
    }
    
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int k = sc.nextInt();
        sc.nextLine();
        List<List<Integer>> lists = new ArrayList<>();
        for(int i = 0; i < k; i++) {
            String line = sc.nextLine();
            List<Integer> list = new ArrayList<>();
            if(!line.trim().isEmpty()) {
                String[] nums = line.split(" ");
                for(String num : nums) {
                    list.add(Integer.parseInt(num));
                }
            }
            lists.add(list);
        }
        List<Integer> result = mergeKLists(lists);
        for(int i = 0; i < result.size(); i++) {
            System.out.print(result.get(i));
            if(i < result.size() - 1) System.out.print(" ");
        }
        System.out.println();
    }
}`,
      javascript: `function mergeKLists(lists) {
    // Write your code here
    
}

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let input = [];
rl.on('line', (line) => {
    input.push(line);
}).on('close', () => {
    const k = parseInt(input[0]);
    const lists = [];
    for(let i = 1; i <= k; i++) {
        if(input[i] && input[i].trim()) {
            lists.push(input[i].split(' ').map(Number));
        } else {
            lists.push([]);
        }
    }
    const result = mergeKLists(lists);
    console.log(result.join(' '));
});`,
      c: `#include <stdio.h>
#include <stdlib.h>

int* mergeKLists(int** lists, int* listSizes, int k, int* returnSize) {
    // Write your code here
    
}

int main() {
    int k;
    scanf("%d", &k);
    getchar();
    // Implement input parsing
    return 0;
}`,
    },
    testcases: [
      { input: '3\n1 4 5\n1 3 4\n2 6', output: '1 1 2 3 4 4 5 6' },
      { input: '0\n', output: '' },
      { input: '2\n\n', output: '' },
      { input: '1\n1 2 3', output: '1 2 3' },
    ],
  },
  // Edge case: Coding question with minimal boilerplate
  {
    type: 'coding',
    title: 'Simple Addition',
    description: 'Add two numbers.',
    difficulty: 'Easy',
    marks: 10,
    constraints: '-1000 <= a and b <= 1000',
    inputFormat: 'Two space-separated integers',
    outputFormat: 'Sum of the two integers',
    boilerplateCode: {
      python: `a, b = map(int, input().split())
# Write your code here
`,
    },
    testcases: [
      { input: '5 3', output: '8' },
      { input: '-5 3', output: '-2' },
      { input: '0 0', output: '0' },
    ],
  },
];

// Combine all questions
const allQuestions = [...mcqQuestions, ...codingQuestions];

// Seed data for Contests
const contests = [
  {
    title: 'Beginner Programming Contest',
    description: 'A contest for beginners to test their basic programming skills. This contest includes easy problems on arrays, strings, and basic algorithms.',
    type: 'coding',
    joinId: '123456',
    startTime: new Date('2026-01-09T10:00:00Z'),
    endTime: new Date('2026-01-09T14:00:00Z'),
    questions: [], // Will be populated with question IDs
    author: '', // Will be populated with admin user ID
    rules: [
      'No plagiarism allowed',
      'Internet access is permitted for documentation only',
      'Submissions are final once submitted',
      'Time limit: 3 hours',
    ],
    visibility: 'public',
    status: 'waiting',
  },
  {
    title: 'Data Structures Challenge',
    description: 'Test your knowledge of fundamental data structures including stacks, queues, linked lists, trees, and graphs.',
    type: 'coding',
    joinId: '654321',    startTime: new Date('2026-02-05T14:00:00Z'),
    endTime: new Date('2026-02-05T18:00:00Z'),
    questions: [],
    author: '',
    rules: [
      'Calculator allowed',
      'No communication with other participants',
      'Code must be your own work',
      'Time limit: 4 hours',
    ],
    visibility: 'public',
    status: 'waiting',
  },
  {
    title: 'Algorithm Masterclass',
    description: 'Advanced algorithmic problems focusing on dynamic programming, graph algorithms, and optimization techniques. For experienced programmers only.',
    type: 'coding',
    joinId: '112233',
    startTime: new Date('2026-02-10T09:00:00Z'),
    endTime: new Date('2026-02-10T14:00:00Z'),
    questions: [],
    author: '',
    rules: [
      'No external help allowed',
      'All standard libraries permitted',
      'Partial scoring enabled',
      'Time limit: 5 hours',
    ],
    visibility: 'private',
    status: 'waiting',
  },
  {
    title: 'Quick MCQ Quiz',
    description: 'A rapid-fire MCQ quiz covering computer science fundamentals, programming concepts, and software engineering principles.',
    type: 'mcq',
    joinId: '445566',
    startTime: new Date('2026-01-25T11:00:00Z'),
    endTime: new Date('2026-01-25T12:00:00Z'),
    questions: [],
    author: '',
    rules: [
      'Single attempt only',
      'No negative marking',
      'Questions cannot be revisited once answered',
      'Time limit: 1 hour',
    ],
    visibility: 'public',
    status: 'waiting',
  },
  {
    title: 'Mixed Assessment Test',
    description: 'A comprehensive assessment combining both MCQ questions and coding problems to evaluate overall programming proficiency.',
    type: 'mixed',
    joinId: '778899',
    startTime: new Date('2026-02-15T10:00:00Z'),
    endTime: new Date('2026-02-15T15:00:00Z'),
    questions: [],
    author: '',
    rules: [
      'Answer all questions',
      'Coding problems carry more weight',
      'Time management is crucial',
      'Time limit: 5 hours',
    ],
    visibility: 'public',
    status: 'waiting',
  },
  // Edge case: Contest that has already ended
  {
    title: 'Past Contest - Winter Challenge 2025',
    description: 'This contest has already concluded. Results are available.',
    type: 'coding',
    joinId: '000999',
    startTime: new Date('2025-12-01T10:00:00Z'),
    endTime: new Date('2025-12-01T15:00:00Z'),
    questions: [],
    author: '',
    rules: ['Contest has ended', 'Check leaderboard for results'],
    visibility: 'public',
    status: 'completed',
  },
  // Edge case: Contest starting very soon
  {
    title: 'Upcoming Sprint - Starting Soon',
    description: 'Get ready! This contest starts in a few hours.',
    type: 'mcq',
    joinId: '333444',
    startTime: new Date('2026-01-07T10:00:00Z'),
    endTime: new Date('2026-01-07T11:30:00Z'),
    questions: [],
    author: '',
    rules: ['Be on time', 'No late entries'],
    visibility: 'public',
    status: 'waiting',
  },
  // Edge case: Currently Ongoing Contest
  {
    title: 'Live Hackathon 2026',
    description: 'This contest is currently live! Join now.',
    type: 'mixed',
    joinId: '555666',
    startTime: new Date('2026-01-01T00:00:00Z'),
    endTime: new Date('2026-01-31T23:59:59Z'),
    questions: [],
    author: '',
    rules: ['Live contest rules'],
    visibility: 'public',
    status: 'ongoing',
  },
  // Edge case: Very long duration contest
  {
    title: 'Monthly Marathon Challenge',
    description: 'A month-long coding challenge with problems released weekly. Solve at your own pace!',
    type: 'coding',
    joinId: '777888',
    startTime: new Date('2026-03-01T00:00:00Z'),
    endTime: new Date('2026-03-31T23:59:59Z'),
    questions: [],
    author: '',
    rules: [
      'New problems every Monday',
      'Unlimited submissions',
      'Best score counts',
      'Community discussion allowed after first week',
    ],
    visibility: 'public',
    status: 'waiting',
  },
  // Edge case: Private contest with no description
  {
    title: 'Internal Assessment',
    description: '',
    type: 'mixed',
    joinId: '999000',
    startTime: new Date('2026-02-20T10:00:00Z'),
    endTime: new Date('2026-02-20T12:00:00Z'),
    questions: [],
    author: '',
    rules: [],
    visibility: 'private',
    status: 'waiting',
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
    const contests = [
      {
        title: 'Beginner Programming Contest',
        description: 'A contest for beginners to test their basic programming skills.',
        type: 'coding',
        startTime: new Date('2026-02-01T10:00:00Z'),
        endTime: new Date('2026-02-01T13:00:00Z'),
        questions: codingQuestions.map(q => q._id.toString()),
        author: adminUser._id.toString(),
        rules: ['No plagiarism allowed', 'Time limit: 3 hours'],
        visibility: 'public',
        status: 'waiting',
      },
      {
        title: 'Quick MCQ Quiz',
        description: 'A rapid-fire MCQ quiz covering computer science fundamentals.',
        type: 'mcq',
        startTime: new Date('2026-01-25T11:00:00Z'),
        endTime: new Date('2026-01-25T12:00:00Z'),
        questions: mcqQuestions.map(q => q._id.toString()),
        author: adminUser._id.toString(),
        rules: ['Single attempt only', 'No negative marking'],
        visibility: 'public',
        status: 'waiting',
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
        startedAt: new Date('2026-02-01T10:05:00Z'),
        submittedAt: new Date('2026-02-01T12:30:00Z'),
        status: 'Completed',
        totalScore: 30,
        submissions: [
          {
            question: codingQuestions[0]._id,
            answer: ['def twoSum(nums, target):\\n    seen = {}\\n    for i, num in enumerate(nums):\\n        if target - num in seen:\\n            return [seen[target - num], i]\\n        seen[num] = i'],
            language: 'python',
            status: 'Accepted',
            testCaseResults: [
              { testCase: 1, passed: true, input: '4 9\\n2 7 11 15', expectedOutput: '0 1', actualOutput: '0 1' },
              { testCase: 2, passed: true, input: '3 6\\n3 2 4', expectedOutput: '1 2', actualOutput: '1 2' },
            ],
            executionTime: 45,
            memoryUsed: 2048,
            score: 30,
            submittedAt: new Date('2026-02-01T11:00:00Z'),
          },
        ],
      },
    ];

    const createdSubmissions = await Submission.insertMany(submissions);
    console.log(`${createdSubmissions.length} submissions created.`);

    console.log('\\nDatabase seeded successfully!');
    console.log('\\nSummary:');
    console.log(`   Users: ${createdUsers.length}`);
    console.log(`   Questions: ${createdQuestions.length} (${mcqQuestions.length} MCQ, ${codingQuestions.length} Coding)`);
    console.log(`   Contests: ${createdContests.length}`);
    console.log(`   Submissions: ${createdSubmissions.length}`);
    console.log('\\nAdmin credentials:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Password: admin123`);
    console.log('\\nUser credentials:');
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
