# CONTRIBUTING

## Standards
- Keep controllers thin
- Keep business logic in services
- Validate requests with Zod
- Use the shared response envelope
- Preserve role guards and state validations

## Folder Strategy
- Frontend and backend stay separated
- Domain concerns should remain grouped
- Shared utilities belong in `utils`, `components`, or `lib` based on runtime ownership
