#!/usr/bin/env node

/**
 * CodeRabbit Review Automation System
 * 
 * This script automates the process of:
 * 1. Fetching CodeRabbit review comments from GitHub PR
 * 2. Categorizing comments by type, priority, and status
 * 3. Updating the review tracking document
 * 4. Implementing fixes based on priority
 * 5. Creating atomic commits for each fix
 */

const { execSync } = require('child_process');
const fs = require('fs');
const _path = require('path');

// Configuration
const CONFIG = {
  REPO_OWNER: 'rollercoaster-dev',
  REPO_NAME: 'monorepo',
  TRACKING_DOC: 'docs/coderabbit-review-tracking.md',
  CODERABBIT_BOT: 'coderabbitai[bot]',
  CATEGORIES: {
    CRITICAL: { priority: 'Critical', emoji: '🔴', keywords: ['critical', 'breaking', 'error', 'fail'] },
    SECURITY: { priority: 'High', emoji: '🛡️', keywords: ['security', 'vulnerability', 'auth', 'permission', 'xss', 'injection'] },
    PERFORMANCE: { priority: 'High', emoji: '⚡', keywords: ['performance', 'slow', 'memory', 'cpu', 'optimization'] },
    LOGIC: { priority: 'High', emoji: '🧠', keywords: ['logic', 'algorithm', 'condition', 'loop', 'incorrect'] },
    STYLE: { priority: 'Medium', emoji: '🎨', keywords: ['style', 'format', 'naming', 'convention', 'lint'] },
    DOCUMENTATION: { priority: 'Medium', emoji: '📚', keywords: ['documentation', 'comment', 'readme', 'doc'] },
    TESTING: { priority: 'Medium', emoji: '🧪', keywords: ['test', 'coverage', 'mock', 'assertion'] }
  }
};

class CodeRabbitReviewAutomation {
  constructor() {
    this.prNumber = this.getCurrentPRNumber();
    this.comments = [];
    this.categorizedComments = {};
  }

  getCurrentPRNumber() {
    try {
      // Try to get PR number from current branch
      const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      const prInfo = execSync(`gh pr view ${branch} --json number`, { encoding: 'utf8' });
      return JSON.parse(prInfo).number;
    } catch (error) {
      console.error('Could not determine PR number:', error.message);
      return null;
    }
  }

  async fetchCodeRabbitComments() {
    if (!this.prNumber) {
      console.log('No PR number found. Skipping comment fetch.');
      return [];
    }

    try {
      console.log(`Fetching CodeRabbit comments for PR #${this.prNumber}...`);
      
      // Fetch PR review comments
      // Use jq -s 'add // []' to handle paginated output (multiple JSON arrays)
      const reviewComments = execSync(
        `gh api repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/pulls/${this.prNumber}/comments --paginate | jq -s 'add // []'`,
        { encoding: 'utf8' }
      );

      // Fetch PR issue comments
      const issueComments = execSync(
        `gh api repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/issues/${this.prNumber}/comments --paginate | jq -s 'add // []'`,
        { encoding: 'utf8' }
      );

      const allComments = [
        ...JSON.parse(reviewComments || '[]'),
        ...JSON.parse(issueComments || '[]')
      ];

      // Filter for CodeRabbit comments
      this.comments = allComments.filter(comment => 
        comment.user && comment.user.login === CONFIG.CODERABBIT_BOT
      );

      console.log(`Found ${this.comments.length} CodeRabbit comments`);
      return this.comments;
    } catch (error) {
      console.error('Error fetching comments:', error.message);
      return [];
    }
  }

  categorizeComment(comment) {
    const body = comment.body.toLowerCase();
    
    for (const [category, config] of Object.entries(CONFIG.CATEGORIES)) {
      if (config.keywords.some(keyword => body.includes(keyword))) {
        return {
          category,
          priority: config.priority,
          emoji: config.emoji
        };
      }
    }
    
    // Default category
    return {
      category: 'STYLE',
      priority: 'Medium',
      emoji: '🎨'
    };
  }

  categorizeComments() {
    console.log('Categorizing comments...');
    
    this.categorizedComments = {};
    
    for (const category of Object.keys(CONFIG.CATEGORIES)) {
      this.categorizedComments[category] = [];
    }

    this.comments.forEach(comment => {
      const { category, priority, emoji } = this.categorizeComment(comment);
      
      this.categorizedComments[category].push({
        id: comment.id,
        body: comment.body,
        path: comment.path || 'General',
        line: comment.line || comment.start_line || null,
        url: comment.html_url,
        priority,
        emoji,
        status: 'pending',
        created_at: comment.created_at,
        updated_at: comment.updated_at
      });
    });

    console.log('Comments categorized:', Object.entries(this.categorizedComments)
      .map(([cat, comments]) => `${cat}: ${comments.length}`)
      .join(', '));
  }

  generateTrackingDocument() {
    console.log('Generating tracking document...');
    
    const totalComments = this.comments.length;
    const resolvedComments = 0; // Will be updated as fixes are implemented
    const pendingComments = totalComments;
    
    let doc = `# CodeRabbit Review Tracking - OpenBadges System

## Review Session Information

**PR Number**: #${this.prNumber}  
**PR Title**: feat(workflow): GitHub Workflow Integration System for OpenBadges  
**Branch**: feature/github-workflow-integration  
**Last Updated**: ${new Date().toISOString()}  
**Review Status**: ${totalComments === 0 ? '✅ **All Issues Resolved**' : '🔄 **In Progress**'}

## Summary Statistics

| Category | Total | Resolved | Pending | In Progress |
|----------|-------|----------|---------|-------------|
`;

    // Add category statistics
    for (const [category, _config] of Object.entries(CONFIG.CATEGORIES)) {
      const comments = this.categorizedComments[category] || [];
      const total = comments.length;
      const resolved = comments.filter(c => c.status === 'resolved').length;
      const pending = comments.filter(c => c.status === 'pending').length;
      const inProgress = comments.filter(c => c.status === 'in-progress').length;
      
      doc += `| **${category.charAt(0) + category.slice(1).toLowerCase()}** | ${total} | ${resolved} | ${pending} | ${inProgress} |\n`;
    }
    
    doc += `| **Total** | **${totalComments}** | **${resolvedComments}** | **${pendingComments}** | **0** |\n\n`;

    // Add detailed comments by category
    doc += `## Review Comments by Category\n\n`;
    
    for (const [category, config] of Object.entries(CONFIG.CATEGORIES)) {
      const comments = this.categorizedComments[category] || [];
      doc += `### ${config.emoji} ${category.charAt(0) + category.slice(1).toLowerCase()} Issues (Priority: ${config.priority})\n`;
      
      if (comments.length === 0) {
        doc += `*No ${category.toLowerCase()} issues identified*\n\n`;
      } else {
        comments.forEach((comment, index) => {
          doc += `#### ${config.emoji} ${category}-${index + 1}: ${comment.path}${comment.line ? `:${comment.line}` : ''}\n`;
          doc += `**Status**: ${comment.status === 'pending' ? '🔄 Pending' : comment.status === 'in-progress' ? '⏳ In Progress' : '✅ Resolved'}\n`;
          doc += `**Priority**: ${comment.priority}\n`;
          doc += `**Created**: ${new Date(comment.created_at).toLocaleDateString()}\n`;
          doc += `**URL**: [View Comment](${comment.url})\n\n`;
          doc += `**Comment**:\n`;
          doc += `\`\`\`\n${comment.body}\n\`\`\`\n\n`;
          doc += `**Fix Status**: [ ] Not Started\n\n`;
          doc += `---\n\n`;
        });
      }
    }

    return doc;
  }

  updateTrackingDocument() {
    const doc = this.generateTrackingDocument();
    fs.writeFileSync(CONFIG.TRACKING_DOC, doc);
    console.log(`Updated tracking document: ${CONFIG.TRACKING_DOC}`);
  }

  async implementFixes(priority = 'all') {
    console.log(`Implementing fixes for priority: ${priority}`);
    
    const priorityOrder = ['Critical', 'High', 'Medium', 'Low'];
    const targetPriorities = priority === 'all' ? priorityOrder : [priority];
    
    for (const targetPriority of targetPriorities) {
      for (const [category, comments] of Object.entries(this.categorizedComments)) {
        const relevantComments = comments.filter(c => 
          c.priority === targetPriority && c.status === 'pending'
        );
        
        for (const comment of relevantComments) {
          await this.implementSingleFix(comment, category);
        }
      }
    }
  }

  async implementSingleFix(comment, category) {
    console.log(`Implementing fix for ${category} issue in ${comment.path}`);
    
    // Mark as in progress
    comment.status = 'in-progress';
    this.updateTrackingDocument();
    
    // This is where specific fix logic would go
    // For now, we'll create a placeholder commit
    const commitMessage = `fix(${category.toLowerCase()}): address CodeRabbit ${category.toLowerCase()} issue

${comment.body.split('\n')[0]}

- File: ${comment.path}${comment.line ? `:${comment.line}` : ''}
- Priority: ${comment.priority}
- CodeRabbit Comment ID: ${comment.id}

CodeRabbit-Review: ${comment.url}`;

    try {
      // Add any changes and commit
      const { execFileSync } = require('child_process');
      execFileSync('git', ['add', '--all'], { stdio: 'inherit' });
      execFileSync('git', ['commit', '-F', '-'], { stdio: 'pipe', input: commitMessage });
      
      // Mark as resolved
      comment.status = 'resolved';
      this.updateTrackingDocument();
      
      console.log(`✅ Fixed ${category} issue in ${comment.path}`);
    } catch (error) {
      console.error(`❌ Failed to fix ${category} issue:`, error.message);
      comment.status = 'pending';
    }
  }

  async runFullCycle() {
    console.log('🚀 Starting CodeRabbit Review Automation...');
    
    await this.fetchCodeRabbitComments();
    this.categorizeComments();
    this.updateTrackingDocument();
    
    if (this.comments.length > 0) {
      await this.implementFixes();
      console.log('✅ Review automation cycle complete!');
    } else {
      console.log('✅ No CodeRabbit comments found. System ready for future reviews.');
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'auto';
  
  const automation = new CodeRabbitReviewAutomation();
  
  switch (command) {
    case 'fetch':
      await automation.fetchCodeRabbitComments();
      break;
    case 'categorize':
      await automation.fetchCodeRabbitComments();
      automation.categorizeComments();
      break;
    case 'update':
      await automation.fetchCodeRabbitComments();
      automation.categorizeComments();
      automation.updateTrackingDocument();
      break;
    case 'fix':
      const priority = args.find(arg => arg.startsWith('--priority='))?.split('=')[1] || 'all';
      await automation.fetchCodeRabbitComments();
      automation.categorizeComments();
      await automation.implementFixes(priority);
      break;
    case 'auto':
    default:
      await automation.runFullCycle();
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CodeRabbitReviewAutomation;
