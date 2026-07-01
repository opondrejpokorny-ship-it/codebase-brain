# Decision Memory persistence

Decision records should stay local-first and try optional persisted storage when available.

Recommended flow:

1. write the record to local Decision Memory immediately,
2. attempt to create a `DecisionMemory` entity record,
3. keep the local record even when persisted storage is missing,
4. show the persistence source in the UI later.
