const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
  },
  title: {type:String, required: true},
  description: String,
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
  },
  marks: Number,
  // MCQ specific fields
  questionType: {
    type: String,
    enum: ['Single Correct', 'Multiple Correct', 'Coding'],
  },
  options: [String],
  correctAnswer: mongoose.Schema.Types.Mixed,
  // Coding specific fields
  constraints: String,
  inputFormat: String,
  outputFormat: String,
  boilerplateCode: {
    cpp: String,
    c: String,
    java: String,
    python: String,
    javascript: String,
  },
  functionName: String,
  inputVariables: [{
    name: String,
    type: {
      type: String,
      enum: ['int', 'float', 'char', 'string', 'int_array', 'float_array', 'string_array']
    }
  }],
  testcases: [{
    input: { type: String},
    output: { type: String}
  }],
}, { timestamps: true });

module.exports = mongoose.models.Question || mongoose.model('Question', questionSchema);
