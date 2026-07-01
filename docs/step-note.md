# PR event queue wiring note

Next implementation should connect incoming pull request events to the internal queue by:

1. normalizing the event into an internal queue record,
2. saving the record only to internal storage,
3. showing the item in PR Inbox,
4. keeping GitHub write actions disabled by default.
