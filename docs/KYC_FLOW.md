# KYC_FLOW

## Flow
1. Booking is created.
2. A KYC session is created with room and session identifiers.
3. Customer joins the video room.
4. Reviewer joins and observes evidence.
5. Admin marks the session verified or rejected.
6. Booking moves forward or stops based on the result.

## Guardrails
- Only one active KYC session per booking
- Session must belong to the same booking and customer
- Review notes should be persisted for auditability
