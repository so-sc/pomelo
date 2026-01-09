const mongoose = require('mongoose');
const User = require('../models/User');
const Question = require('../models/Question');
const Contest = require('../models/Contest');
const Submission = require('../models/Submissions');

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

// Seed data for Users
const users = [
  {
    clerkId: 'user_admin_001',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    registeredContests: [],
  },
  {
    clerkId: 'user_student_001',
    email: 'john.doe@student.com',
    name: 'John Doe',
    role: 'user',
    registeredContests: [],
  },
  {
    clerkId: 'user_student_002',
    email: 'jane.smith@student.com',
    name: 'Jane Smith',
    role: 'user',
    registeredContests: [],
  },
  {
    clerkId: 'user_student_003',
    email: 'bob.wilson@student.com',
    name: 'Bob Wilson',
    role: 'user',
    registeredContests: [],
  },
  {
    clerkId: 'user_student_004',
    email: 'alice.johnson@student.com',
    name: 'Alice Johnson',
    role: 'user',
    registeredContests: [],
  },
  // Edge case: User with very long name
  {
    clerkId: 'user_edge_001',
    email: 'verylongname@example.com',
    name: 'Christopher Alexander Montgomery Wellington-Smithson III',
    role: 'user',
    registeredContests: [],
  },
  // Edge case: User with minimal data
  {
    clerkId: 'user_minimal_001',
    email: '',
    name: '',
    role: 'user',
    registeredContests: [],
  },
];

// Seed data for Questions - MCQ Questions
const mcqQuestions = [
  {
    type: 'mcq',
    title: 'What is the time complexity of binary search?',
    description: 'Binary search is a searching algorithm that finds the position of a target value within a sorted array.',
    difficulty: 'Easy',
    marks: 10,
    questionType: 'Single Correct',
    options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
    correctAnswer: '1', // Index of correct option
  },
  {
    type: 'mcq',
    title: 'Which data structures use LIFO principle?',
    description: 'Select all data structures that follow Last In First Out principle.',
    difficulty: 'Easy',
    marks: 15,
    questionType: 'Multiple Correct',
    options: ['Stack', 'Queue', 'Deque (when used as stack)', 'Linked List'],
    correctAnswer: '0,2', // Multiple indices separated by comma
  },
  {
    type: 'mcq',
    title: 'What is the output of the following JavaScript code: console.log(typeof NaN)?',
    description: 'Understanding JavaScript types and NaN behavior.',
    difficulty: 'Medium',
    marks: 10,
    questionType: 'Single Correct',
    options: ['NaN', 'number', 'undefined', 'object'],
    correctAnswer: '1',
  },
  {
    type: 'mcq',
    title: 'Which of the following are valid HTTP methods?',
    description: 'Select all valid HTTP request methods.',
    difficulty: 'Medium',
    marks: 20,
    questionType: 'Multiple Correct',
    options: ['GET', 'POST', 'FETCH', 'PUT', 'DELETE', 'PATCH'],
    correctAnswer: '0,1,3,4,5',
  },
  {
    type: 'mcq',
    title: 'What is the space complexity of merge sort?',
    description: 'Analyze the space complexity of the merge sort algorithm.',
    difficulty: 'Hard',
    marks: 15,
    questionType: 'Single Correct',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctAnswer: '2',
  },
  // Edge case: MCQ with very long options
  {
    type: 'mcq',
    title: 'Which statement about database normalization is correct?',
    description: 'Understanding database design principles.',
    difficulty: 'Hard',
    marks: 20,
    questionType: 'Single Correct',
    options: [
      'First Normal Form (1NF) requires that all attributes contain only atomic values and each record needs to be unique, eliminating repeating groups',
      'Second Normal Form (2NF) requires that the table is in 1NF and all non-key attributes are fully functionally dependent on the primary key',
      'Third Normal Form (3NF) requires that the table is in 2NF and has no transitive dependencies between non-key attributes',
      'All of the above statements are correct and describe different levels of database normalization',
    ],
    correctAnswer: '3',
  },
];

// Seed data for Questions - Coding Questions
const codingQuestions = [
  {
    type: 'coding',
    title: 'Two Sum',
    description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

Example 2:
Input: nums = [3,2,4], target = 6
Output: [1,2]

Example 3:
Input: nums = [3,3], target = 6
Output: [0,1]`,
    difficulty: 'Easy',
    marks: 30,
    constraints:
      '2 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9, -10^9 <= target <= 10^9, Only one valid answer exists.',
    inputFormat: 'First line contains n (size of array) and target\nSecond line contains n space-separated integers',
    outputFormat: 'Two space-separated integers representing the indices',
    boilerplateCode: {
      cpp: `#include <iostream>
#include <vector>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    // Write your code here
    
}

int main() {
    int n, target;
    cin >> n >> target;
    vector<int> nums(n);
    for(int i = 0; i < n; i++) {
        cin >> nums[i];
    }
    vector<int> result = twoSum(nums, target);
    cout << result[0] << " " << result[1] << endl;
    return 0;
}`,
      c: `#include <stdio.h>
#include <stdlib.h>

void twoSum(int* nums, int numsSize, int target, int* result) {
    // Write your code here
    
}

int main() {
    int n, target;
    scanf("%d %d", &n, &target);
    int* nums = (int*)malloc(n * sizeof(int));
    for(int i = 0; i < n; i++) {
        scanf("%d", &nums[i]);
    }
    int result[2];
    twoSum(nums, n, target, result);
    printf("%d %d\\n", result[0], result[1]);
    free(nums);
    return 0;
}`,
      java: `import java.util.*;

public class Solution {
    public static int[] twoSum(int[] nums, int target) {
        // Write your code here
        
    }
    
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int target = sc.nextInt();
        int[] nums = new int[n];
        for(int i = 0; i < n; i++) {
            nums[i] = sc.nextInt();
        }
        int[] result = twoSum(nums, target);
        System.out.println(result[0] + " " + result[1]);
    }
}`,
      python: `def twoSum(nums, target):
    # Write your code here
    pass

if __name__ == "__main__":
    n, target = map(int, input().split())
    nums = list(map(int, input().split()))
    result = twoSum(nums, target)
    print(result[0], result[1])`,
      javascript: `function twoSum(nums, target) {
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
    const [n, target] = input[0].split(' ').map(Number);
    const nums = input[1].split(' ').map(Number);
    const result = twoSum(nums, target);
    console.log(result[0] + ' ' + result[1]);
});`,
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
    description: `Given an integer x, return true if x is a palindrome, and false otherwise.

Example 1:
Input: x = 121
Output: true
Explanation: 121 reads as 121 from left to right and from right to left.

Example 2:
Input: x = -121
Output: false
Explanation: From left to right, it reads -121. From right to left, it becomes 121-. Therefore it is not a palindrome.

Example 3:
Input: x = 10
Output: false
Explanation: Reads 01 from right to left. Therefore it is not a palindrome.`,
    difficulty: 'Easy',
    marks: 25,
    constraints: `-2^31 <= x <= 2^31 - 1`,
    inputFormat: 'A single integer x',
    outputFormat: 'true or false',
    boilerplateCode: {
      cpp: `#include <iostream>
using namespace std;

bool isPalindrome(int x) {
    // Write your code here
    
}

int main() {
    int x;
    cin >> x;
    cout << (isPalindrome(x) ? "true" : "false") << endl;
    return 0;
}`,
      python: `def isPalindrome(x):
    # Write your code here
    pass

if __name__ == "__main__":
    x = int(input())
    print("true" if isPalindrome(x) else "false")`,
      java: `import java.util.*;

public class Solution {
    public static boolean isPalindrome(int x) {
        // Write your code here
        
    }
    
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int x = sc.nextInt();
        System.out.println(isPalindrome(x) ? "true" : "false");
    }
}`,
      javascript: `function isPalindrome(x) {
    // Write your code here
    
}

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (line) => {
    const x = parseInt(line);
    console.log(isPalindrome(x) ? "true" : "false");
    rl.close();
});`,
      c: `#include <stdio.h>
#include <stdbool.h>

bool isPalindrome(int x) {
    // Write your code here
    
}

int main() {
    int x;
    scanf("%d", &x);
    printf("%s\\n", isPalindrome(x) ? "true" : "false");
    return 0;
}`,
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
    await User.deleteMany({});
    await Question.deleteMany({});
    await Contest.deleteMany({});
    await Submission.deleteMany({});
    console.log('Existing data cleared.');

    // Seed Users
    console.log('Seeding users...');
    const createdUsers = await User.insertMany(users);
    console.log(`${createdUsers.length} users created.`);

    // Get admin user for contest author
    const adminUser = createdUsers.find(u => u.role === 'admin');
    const regularUsers = createdUsers.filter(u => u.role === 'user');

    // Seed Questions
    console.log('Seeding questions...');
    const createdQuestions = await Question.insertMany(allQuestions);
    console.log(`${createdQuestions.length} questions created.`);

    // Categorize questions
    const mcqQuestionIds = createdQuestions.filter(q => q.type === 'mcq').map(q => q._id.toString());
    const codingQuestionIds = createdQuestions.filter(q => q.type === 'coding').map(q => q._id.toString());

    // Update contests with question IDs and author
    contests[0].questions = codingQuestionIds.slice(0, 2); // Beginner contest - easy coding
    contests[0].author = adminUser.clerkId;

    contests[1].questions = codingQuestionIds.slice(1, 4); // Data structures - medium coding
    contests[1].author = adminUser.clerkId;

    contests[2].questions = codingQuestionIds.slice(2); // Advanced - hard coding
    contests[2].author = adminUser.clerkId;

    contests[3].questions = mcqQuestionIds.slice(0, 4); // MCQ quiz
    contests[3].author = adminUser.clerkId;

    contests[4].questions = [...mcqQuestionIds.slice(0, 3), ...codingQuestionIds.slice(0, 2)]; // Mixed
    contests[4].author = adminUser.clerkId;

    contests[5].questions = codingQuestionIds.slice(0, 3); // Past contest
    contests[5].author = adminUser.clerkId;

    contests[6].questions = mcqQuestionIds.slice(0, 5); // Starting soon
    contests[6].author = adminUser.clerkId;

    contests[7].questions = [...codingQuestionIds.slice(0, 2), ...mcqQuestionIds.slice(0, 3)]; // Live Hackathon
    contests[7].author = adminUser.clerkId;

    contests[8].questions = codingQuestionIds; // Marathon
    contests[8].author = adminUser.clerkId;

    contests[9].questions = [...mcqQuestionIds.slice(0, 2), ...codingQuestionIds.slice(0, 1)]; // Internal
    contests[9].author = adminUser.clerkId;

    // Seed Contests
    console.log('Seeding contests...');
    const createdContests = await Contest.insertMany(contests);
    console.log(`${createdContests.length} contests created.`);

    // Update users with registered contests
    console.log('Updating user registrations...');
    for (let i = 0; i < regularUsers.length; i++) {
      const contestsToRegister = createdContests
        .filter(c => c.visibility === 'public')
        .slice(0, Math.min(i + 2, createdContests.length))
        .map(c => c._id);

      await User.findByIdAndUpdate(regularUsers[i]._id, {
        registeredContests: contestsToRegister,
      });
    }
    console.log('User registrations updated.');

    // Seed some sample submissions
    console.log('Seeding submissions...');
    const submissions = [];

    // Submission 1: Complete submission with good score
    submissions.push({
      contest: createdContests[0]._id,
      user: regularUsers[0]._id,
      startedAt: new Date('2026-02-01T10:05:00Z'),
      submittedAt: new Date('2026-02-01T12:30:00Z'),
      totalScore: 55,
      submissions: [
        {
          question: createdQuestions.find(q => q.title === 'Two Sum')._id,
          answer: 'def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        if target - num in seen:\n            return [seen[target - num], i]\n        seen[num] = i',
          language: 'python',
          status: 'Accepted',
          testCaseResults: [
            { testCase: 1, passed: true, input: '4 9\n2 7 11 15', expectedOutput: '0 1', actualOutput: '0 1' },
            { testCase: 2, passed: true, input: '3 6\n3 2 4', expectedOutput: '1 2', actualOutput: '1 2' },
            { testCase: 3, passed: true, input: '2 6\n3 3', expectedOutput: '0 1', actualOutput: '0 1' },
            { testCase: 4, passed: true, input: '5 10\n1 5 3 7 9', expectedOutput: '1 3', actualOutput: '1 3' },
          ],
          executionTime: 45,
          memoryUsed: 2048,
          score: 30,
          submittedAt: new Date('2026-02-01T11:00:00Z'),
        },
        {
          question: createdQuestions.find(q => q.title === 'Palindrome Number')._id,
          answer: 'def isPalindrome(x):\n    if x < 0:\n        return False\n    return str(x) == str(x)[::-1]',
          language: 'python',
          status: 'Accepted',
          testCaseResults: [
            { testCase: 1, passed: true, input: '121', expectedOutput: 'true', actualOutput: 'true' },
            { testCase: 2, passed: true, input: '-121', expectedOutput: 'false', actualOutput: 'false' },
            { testCase: 3, passed: true, input: '10', expectedOutput: 'false', actualOutput: 'false' },
            { testCase: 4, passed: true, input: '0', expectedOutput: 'true', actualOutput: 'true' },
            { testCase: 5, passed: true, input: '12321', expectedOutput: 'true', actualOutput: 'true' },
          ],
          executionTime: 32,
          memoryUsed: 1536,
          score: 25,
          submittedAt: new Date('2026-02-01T12:30:00Z'),
        },
      ],
    });

    // Submission 2: Partial success
    submissions.push({
      contest: createdContests[0]._id,
      user: regularUsers[1]._id,
      startedAt: new Date('2026-02-01T10:10:00Z'),
      submittedAt: new Date('2026-02-01T12:45:00Z'),
      totalScore: 30,
      submissions: [
        {
          question: createdQuestions.find(q => q.title === 'Two Sum')._id,
          answer: 'def twoSum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]',
          language: 'python',
          status: 'Accepted',
          testCaseResults: [
            { testCase: 1, passed: true, input: '4 9\n2 7 11 15', expectedOutput: '0 1', actualOutput: '0 1' },
            { testCase: 2, passed: true, input: '3 6\n3 2 4', expectedOutput: '1 2', actualOutput: '1 2' },
            { testCase: 3, passed: true, input: '2 6\n3 3', expectedOutput: '0 1', actualOutput: '0 1' },
            { testCase: 4, passed: true, input: '5 10\n1 5 3 7 9', expectedOutput: '1 3', actualOutput: '1 3' },
          ],
          executionTime: 156,
          memoryUsed: 1024,
          score: 30,
          submittedAt: new Date('2026-02-01T11:30:00Z'),
        },
        {
          question: createdQuestions.find(q => q.title === 'Palindrome Number')._id,
          answer: 'def isPalindrome(x):\n    return str(x) == str(x)[::-1]',
          language: 'python',
          status: 'Wrong Answer',
          testCaseResults: [
            { testCase: 1, passed: true, input: '121', expectedOutput: 'true', actualOutput: 'true' },
            { testCase: 2, passed: false, input: '-121', expectedOutput: 'false', actualOutput: 'true', error: 'Wrong output' },
            { testCase: 3, passed: true, input: '10', expectedOutput: 'false', actualOutput: 'false' },
            { testCase: 4, passed: true, input: '0', expectedOutput: 'true', actualOutput: 'true' },
            { testCase: 5, passed: true, input: '12321', expectedOutput: 'true', actualOutput: 'true' },
          ],
          executionTime: 28,
          memoryUsed: 1280,
          score: 0,
          submittedAt: new Date('2026-02-01T12:45:00Z'),
        },
      ],
    });

    // Submission 3: Runtime Error
    submissions.push({
      contest: createdContests[1]._id,
      user: regularUsers[2]._id,
      startedAt: new Date('2026-02-05T14:05:00Z'),
      submittedAt: null, // Not submitted yet
      totalScore: 0,
      submissions: [
        {
          question: createdQuestions.find(q => q.title === 'Palindrome Number')._id,
          answer: 'def isPalindrome(x):\n    return x == int(str(x)[::-1])',
          language: 'python',
          status: 'Runtime Error',
          testCaseResults: [
            { testCase: 1, passed: true, input: '121', expectedOutput: 'true', actualOutput: 'true' },
            { testCase: 2, passed: false, input: '-121', expectedOutput: 'false', actualOutput: '', error: 'ValueError: invalid literal for int()' },
          ],
          executionTime: 0,
          memoryUsed: 1024,
          score: 0,
          submittedAt: new Date('2026-02-05T15:00:00Z'),
        },
      ],
    });

    // Submission 4: Time Limit Exceeded
    submissions.push({
      contest: createdContests[2]._id,
      user: regularUsers[3]._id,
      startedAt: new Date('2026-02-10T09:15:00Z'),
      submittedAt: new Date('2026-02-10T13:45:00Z'),
      totalScore: 0,
      submissions: [
        {
          question: createdQuestions.find(q => q.title === 'Longest Substring Without Repeating Characters')._id,
          answer: 'def lengthOfLongestSubstring(s):\n    max_len = 0\n    for i in range(len(s)):\n        for j in range(i, len(s)):\n            substr = s[i:j+1]\n            if len(substr) == len(set(substr)):\n                max_len = max(max_len, len(substr))\n    return max_len',
          language: 'python',
          status: 'Time Limit Exceeded',
          testCaseResults: [
            { testCase: 1, passed: true, input: 'abcabcbb', expectedOutput: '3', actualOutput: '3' },
            { testCase: 2, passed: true, input: 'bbbbb', expectedOutput: '1', actualOutput: '1' },
            { testCase: 3, passed: false, input: 'pwwkew', expectedOutput: '3', actualOutput: '', error: 'Time limit exceeded (>2000ms)' },
          ],
          executionTime: 2500,
          memoryUsed: 3072,
          score: 0,
          submittedAt: new Date('2026-02-10T13:45:00Z'),
        },
      ],
    });

    // Submission 5: MCQ submission
    submissions.push({
      contest: createdContests[3]._id,
      user: regularUsers[0]._id,
      startedAt: new Date('2026-01-25T11:00:00Z'),
      submittedAt: new Date('2026-01-25T11:45:00Z'),
      totalScore: 45,
      submissions: [
        {
          question: mcqQuestionIds[0],
          answer: '1',
          score: 10,
          submittedAt: new Date('2026-01-25T11:05:00Z'),
        },
        {
          question: mcqQuestionIds[1],
          answer: '0,2',
          score: 15,
          submittedAt: new Date('2026-01-25T11:15:00Z'),
        },
        {
          question: mcqQuestionIds[2],
          answer: '1',
          score: 10,
          submittedAt: new Date('2026-01-25T11:25:00Z'),
        },
        {
          question: mcqQuestionIds[3],
          answer: '0,1,3,4', // Missing one correct answer
          score: 10,
          submittedAt: new Date('2026-01-25T11:35:00Z'),
        },
      ],
    });

    // Submission 6: Pending submission
    submissions.push({
      contest: createdContests[0]._id,
      user: regularUsers[4]._id,
      startedAt: new Date('2026-02-01T10:30:00Z'),
      submittedAt: null,
      totalScore: 0,
      submissions: [
        {
          question: createdQuestions.find(q => q.title === 'Two Sum')._id,
          answer: 'def twoSum(nums, target):\n    # Working on it...',
          language: 'python',
          status: 'Pending',
          testCaseResults: [],
          executionTime: 0,
          memoryUsed: 0,
          score: 0,
          submittedAt: new Date('2026-02-01T10:35:00Z'),
        },
      ],
    });

    const createdSubmissions = await Submission.insertMany(submissions);
    console.log(`${createdSubmissions.length} submissions created.`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Users: ${createdUsers.length}`);
    console.log(`   Questions: ${createdQuestions.length} (${mcqQuestionIds.length} MCQ, ${codingQuestionIds.length} Coding)`);
    console.log(`   Contests: ${createdContests.length}`);
    console.log(`   Submissions: ${createdSubmissions.length}`);
    console.log('\n🔐 Admin credentials:');
    console.log(`   Clerk ID: ${adminUser.clerkId}`);
    console.log(`   Email: ${adminUser.email}`);

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

// Run the seed
connectDB().then(() => {
  seedDatabase()
    .then(() => {
      console.log('\n✨ Seeding completed. Disconnecting...');
      mongoose.connection.close();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      mongoose.connection.close();
      process.exit(1);
    });
});
