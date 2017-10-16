TESTS = $(shell ls -S `find test -type f -name "*.test.js" -print`)
REPORTER = spec
TIMEOUT = 3000
MOCHA_OPTS =

lint:
	@eslint --fix lib test

clean:
	@rm -rf node_modules

install:
	@npm install --production

test:
	@npm run test

test-cov:
	@npm run test-cov

debug:
	@NODE_ENV=test \
		node-debug \
		./node_modules/.bin/_mocha \
		--reporter $(REPORTER) \
		--require co-mocha \
		--timeout $(TIMEOUT) \
		$(MOCHA_OPTS) \
		$(TESTS)

.PHONY: test
