<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Integration rules
- Extend the existing TanStack application and shared catalog entities for prototype workflows; do not run or embed the imported Flask app, so inventory and transactions remain authoritative in one application.
- Provision privileged access explicitly through protected role assignments; the legacy first-user lifecycle hook must remain a no-op to prevent public signup from becoming an owner.
