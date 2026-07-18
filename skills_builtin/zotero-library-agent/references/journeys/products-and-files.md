# Products And Files

Keep these four objects separate: local path, registered `fileId`, Dashboard `productId`, and workflow artifact.

## Upload and attach

Verify a local artifact first, then `file upload` with display name/content type. Preserve checksum and returned short-lived `fileId`. Call `mutation item attach-file` with the current parent item ref and `fileId`, pass approval, then refresh `library item attachments` to prove the new attachment exists.

## Download

Use `file download` only for a registered file handle. Choose an output path deliberately and verify bytes/checksum. Remote Host Bridge operation never makes a Host-local path readable to the agent.

## Dashboard Products

Use `product list` with filters and paging, `product get` for one normal Product, and `product download` for selected assets. A terminal `workflowRunId` does not imply a Product, and `productId` is not a `fileId`. `product remove` removes the Product record through approval; it does not promise immediate managed-file deletion.

On failure, reacquire expired file access from the owning attachment/Product rather than guessing a path. Record origin, handle, checksum, output path, and final live attachment or Product record in evidence.
