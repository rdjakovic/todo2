create table lists (
  id bigint primary key,
  name text not null,
  icon text not null,
  showCompleted boolean default true
);

create table todos (
  id bigint primary key,
  listId bigint references lists(id),
  title text not null,
  notes text,
  completed boolean default false,
  dateCreated timestamp with time zone not null,
  priority text check (priority in ('low', 'medium', 'high')),
  dueDate timestamp with time zone,
  dateOfCompletion timestamp with time zone
);