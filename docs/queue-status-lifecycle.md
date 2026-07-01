# Queue status lifecycle

Internal PR review items should move through a small, explicit status lifecycle:

1. `event_received`
2. `pending_review`
3. `analyzing`
4. `analyzed`
5. `failed`

Repository mismatch and closed PR states stay visible as separate warning states. The UI should avoid hidden write actions and keep GitHub state unchanged unless a human explicitly enables a future write workflow.
