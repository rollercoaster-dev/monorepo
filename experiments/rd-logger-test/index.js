import { Logger } from '@rollercoaster-dev/rd-logger';

console.log('✅ Import successful!');

// Create a logger instance
const logger = new Logger({
  level: 'debug',
  serviceName: 'rd-logger-test'
});

console.log('✅ Logger instance created!');

// Test basic logging
logger.info('Testing rd-logger in monorepo');
logger.debug('Debug message works');
logger.warn('Warning message works');

console.log('✅ All logging methods work!');

// Test with context
logger.info('Message with context', { 
  test: true, 
  monorepo: 'rollercoaster-dev' 
});

console.log('✅ Context logging works!');

// Test that we can create multiple logger instances
const logger2 = new Logger({
  serviceName: 'test-2',
  level: 'info'
});
logger2.info('Second logger instance works!');

console.log('✅ All exports verified!');

console.log('\n🎉 rd-logger package consumption test PASSED!\n');
