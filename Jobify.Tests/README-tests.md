# Jobify Testing

This folder contains the automated test suite for **Jobify**.

The tests were written to validate the main backend logic of the platform, including controllers, services, business rules, validation, authorization behavior, and database side effects.

## Testing Approach

The project mainly uses **unit tests** built with **xUnit** and **Entity Framework Core InMemory Database**.

These tests focus on:

- controller behavior
- service logic
- input validation
- edge cases
- role/authorization scenarios
- database state changes after actions

The goal was to make sure important backend flows behave correctly without needing to run the full application manually for every scenario.

## What Is Covered

### Controllers
Controller tests verify the behavior of the API endpoints and backend actions, including:

- opportunities
- applications
- interviews
- profile-related helper logic

Examples of tested scenarios include:

- returning the correct response for valid and invalid requests
- preventing invalid status transitions
- checking recruiter/student ownership
- handling missing records
- creating, updating, deleting, closing, and reopening entities
- assessment-related flows such as start, save, submit, and reset
- save/unsave flows
- withdraw flows
- file retrieval behavior

### Services
Service tests verify backend business logic such as:

- notification behavior
- recommendation scoring
- CV review logic
- OCR/profile helper logic
- matching logic
- assessment scoring logic

These tests cover both normal and edge cases such as:

- empty inputs
- malformed values
- duplicate skills
- invalid JSON
- case-insensitive matching
- profile strength comparisons
- notification filtering and unread counts

## Tools and Frameworks

The test suite uses:

- **xUnit**
- **Entity Framework Core InMemory**
- **Moq** (for selected service dependencies)

## Running the Tests

Run all tests with:

```bash
dotnet test
