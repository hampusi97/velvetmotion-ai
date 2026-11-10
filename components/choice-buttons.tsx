"use client";

export function ChoiceButtons({
  choices,
  disabled,
  onChoose,
}: {
  choices: string[];
  disabled?: boolean;
  onChoose: (choice: string) => void;
}) {
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const buttons = Array.from(event.currentTarget.querySelectorAll("button"));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    let next = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % buttons.length;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index - 1 + buttons.length) % buttons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = buttons.length - 1;
    else return;
    event.preventDefault();
    buttons[next]?.focus();
  }

  return (
    <div role="group" aria-label="Suggested replies" aria-describedby="choice-hint" className="grid gap-2" onKeyDown={onKeyDown}>
      <p id="choice-hint" className="sr-only">
        Use the arrow keys to move between suggestions. Enter sends the focused reply. You can still type your own message.
      </p>
      {choices.map((choice, index) => (
        <button
          key={choice}
          type="button"
          className="choice-button"
          style={{ animationDelay: `${index * 50}ms` }}
          disabled={disabled}
          onClick={() => onChoose(choice)}
        >
          {choice}
        </button>
      ))}
    </div>
  );
}
