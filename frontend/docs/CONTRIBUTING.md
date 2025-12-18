# Contributing Guide

Cảm ơn bạn đã quan tâm đến việc đóng góp cho dự án! Tài liệu này cung cấp hướng dẫn về cách đóng góp.

## 📋 Mục lục

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)

## Code of Conduct

### Our Standards

- Sử dụng ngôn ngữ welcome và inclusive
- Tôn trọng quan điểm và kinh nghiệm khác nhau
- Chấp nhận constructive criticism
- Tập trung vào những gì tốt nhất cho cộng đồng

### Unacceptable Behavior

- Sử dụng ngôn ngữ hoặc hình ảnh sexualized
- Trolling, comments thiếu tôn trọng/không phù hợp
- Public hoặc private harassment
- Publishing thông tin cá nhân của người khác

## Getting Started

### Prerequisites

- Node.js 18+ và npm 9+
- Git
- Code editor (VS Code recommended)
- Backend API đang chạy (cho development)

### Setup

1. **Fork repository**
   - Click "Fork" button trên GitHub
   - Clone fork của bạn:
   ```bash
   git clone https://github.com/your-username/frontend.git
   cd frontend
   ```

2. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/original-repo/frontend.git
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Create branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

5. **Start development**
   ```bash
   npm run dev
   ```

## Development Process

### 1. Planning

Trước khi bắt đầu code:
- Đọc documentation liên quan
- Kiểm tra existing issues và PRs
- Discuss với maintainers nếu cần (tạo issue trước)

### 2. Implementation

- Follow coding standards
- Write clean, maintainable code
- Add comments khi cần thiết
- Update documentation nếu cần

### 3. Testing

- Test manually trong browser
- Kiểm tra TypeScript errors: `npm run build`
- Kiểm tra linting: `npm run lint`
- Test edge cases

### 4. Documentation

- Update README nếu cần
- Add JSDoc comments cho functions phức tạp
- Update CHANGELOG nếu có breaking changes

## Coding Standards

### TypeScript

- ✅ Always define types/interfaces
- ✅ Avoid `any` type
- ✅ Use type inference khi appropriate
- ✅ Use strict mode

### React

- ✅ Use functional components
- ✅ Use hooks properly
- ✅ Define props interfaces
- ✅ Keep components small và focused

### Code Style

- ✅ 2 spaces indentation
- ✅ Single quotes cho strings
- ✅ Semicolons
- ✅ Max 100 characters per line

### File Organization

```
src/
├── components/     # Reusable components
├── pages/         # Page components
├── services/      # API services
├── store/         # State management
├── utils/         # Utility functions
└── ...
```

### Naming Conventions

- **Components**: PascalCase (`UserProfile.tsx`)
- **Files**: PascalCase cho components, camelCase cho utilities
- **Variables/Functions**: camelCase (`getUserData`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Types**: PascalCase (`UserDto`)

## Commit Guidelines

### Commit Message Format

```
type: subject

body (optional)

footer (optional)
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build process, dependencies
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Examples

```
feat: add file upload progress indicator

Implement progress tracking for file uploads with speed calculation
and time remaining estimation.

Closes #123
```

```
fix: resolve authentication token expiration issue

Token expiration was not being handled properly, causing users to be
logged out unexpectedly. Now properly checks token expiration and
refreshes when needed.
```

```
docs: update API documentation

Add examples for file service methods and error handling.
```

### Commit Best Practices

- ✅ Write clear, descriptive messages
- ✅ Use present tense ("add" not "added")
- ✅ Reference issues/PRs khi có
- ✅ Keep commits focused (one change per commit)
- ❌ Don't commit `node_modules` hoặc build files
- ❌ Don't commit sensitive information

## Pull Request Process

### Before Creating PR

- [ ] Code follows style guide
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Tests pass (nếu có)
- [ ] Documentation updated
- [ ] Commits follow guidelines

### Creating Pull Request

1. **Update your branch**
   ```bash
   git checkout main
   git pull upstream main
   git checkout your-branch
   git rebase main
   ```

2. **Push to your fork**
   ```bash
   git push origin your-branch
   ```

3. **Create Pull Request**
   - Go to GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill in PR template
   - Add reviewers nếu cần

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Checklist
- [ ] Code follows style guide
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added/updated
```

### PR Review Process

1. **Automated Checks**
   - CI/CD pipeline runs
   - TypeScript compilation
   - Linting
   - Tests (nếu có)

2. **Code Review**
   - Maintainers review code
   - Address review comments
   - Make requested changes

3. **Approval & Merge**
   - After approval, PR will be merged
   - Squash và merge (preferred) hoặc merge commit

### Addressing Review Comments

- Be respectful và professional
- Ask questions nếu không hiểu
- Make requested changes
- Re-request review sau khi update

## Reporting Issues

### Before Reporting

- Check existing issues
- Verify issue với latest version
- Try to reproduce issue

### Issue Template

```markdown
## Description
Clear description of the issue

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., Windows 10]
- Browser: [e.g., Chrome 120]
- Node version: [e.g., 18.17.0]
- Version: [e.g., 1.0.0]

## Screenshots
If applicable

## Additional Context
Any other relevant information
```

### Bug Report Best Practices

- ✅ Provide clear description
- ✅ Include steps to reproduce
- ✅ Add screenshots nếu có
- ✅ Include environment info
- ✅ Check if issue already exists
- ❌ Don't report security issues publicly (email instead)

## Feature Requests

### Feature Request Template

```markdown
## Feature Description
Clear description of the feature

## Use Case
Why is this feature needed?

## Proposed Solution
How should this work?

## Alternatives Considered
Other solutions you've considered

## Additional Context
Any other relevant information
```

### Feature Request Best Practices

- ✅ Explain use case clearly
- ✅ Describe proposed solution
- ✅ Consider alternatives
- ✅ Check if feature already requested
- ✅ Be open to discussion

## Code Review Guidelines

### For Reviewers

- Be constructive và respectful
- Explain reasoning cho suggestions
- Approve nếu code is good
- Request changes với clear feedback

### For Authors

- Respond to all comments
- Make requested changes
- Ask questions nếu không hiểu
- Thank reviewers

## Questions?

Nếu có câu hỏi:
- Check existing documentation
- Search existing issues
- Create new issue với question label
- Contact maintainers

## Recognition

Contributors sẽ được:
- Listed trong CONTRIBUTORS.md
- Mentioned trong release notes
- Thanked trong project documentation

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT).

## Thank You!

Cảm ơn bạn đã đóng góp cho dự án! Mọi đóng góp, dù nhỏ, đều được đánh giá cao.
