import Bolt, {
  ButtonAction,
  ExternalSelectAction,
  KnownBlock,
} from "@slack/bolt";
const { App } = Bolt;
import env from "./utils/env.js";
import Fuse from "fuse.js";

const app = new App({
  token: env.TOKEN,
  signingSecret: env.SIGNING_SECRET,
});

app.event("app_home_opened", async ({ ack, event, client }) => {
  updateHome(event.user);
});

const updateHome = async (
  user: string,
  current?: { id: string; name: string },
  lastaction?: string
) => {
  const blocks: KnownBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "usergroups manager yay",
      },
    },
    {
      type: "divider",
    },
    {
      type: "actions",
      elements: [
        {
          type: "external_select",
          placeholder: {
            type: "plain_text",
            text: "Select a usergroup",
          },
          action_id: "usergroup_select",
          initial_option: current
            ? {
                text: { type: "plain_text", text: current.name },
                value: current.id,
              }
            : undefined,
        },
      ],
    },
  ];

  if (current) {
    const group = await app.client.usergroups.users.list({
      usergroup: current.id,
    });
    const ingroup = group.users?.includes(user);

    blocks.push(
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<!subteam^${current.id}>`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: ingroup ? "Leave" : "Join",
            },
            action_id: "toggle_usergroup",
            value: current.id,
            style: ingroup ? "danger" : "primary",
          },
        ],
      }
    );
  }

  if (lastaction)
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `You ${lastaction}`,
      },
    });

  await app.client.views.publish({
    user_id: user,
    view: {
      type: "home",
      blocks,
    },
  });
};

const usergroups: { id: string; name: string; handle: string }[] = [];
const getUsergroupPage = async (cursor?: string) => {
  const res = await app.client.usergroups.list({
    token: env.TOKEN,
    include_count: true,
    include_users: true,
    limit: 1000,
    cursor,
  });
  usergroups.push(
    ...(res.usergroups as any[]).map((ug) => ({
      id: ug.id,
      name: ug.name,
      handle: ug.handle,
    }))
  );
  if (res.response_metadata!.next_cursor) {
    await getUsergroupPage(res.response_metadata!.next_cursor);
  }
};
getUsergroupPage();

app.options("usergroup_select", async ({ ack, body, options }) => {
  const fuse = new Fuse(usergroups, {
    keys: ["name", "handle"],
    shouldSort: true,
  });

  const result = fuse.search(options.value, { limit: 100 });

  ack({
    options: result.map((ug) => ({
      text: {
        type: "plain_text",
        text: `@${ug.item.handle} - ${ug.item.name}`,
      },
      value: ug.item.id,
    })),
  });
});

app.action("usergroup_select", async ({ ack, body, action, client }) => {
  ack();
  const a = action as ExternalSelectAction;
  console.log(a);

  if (a.selected_option?.value)
    await updateHome(body.user.id, {
      id: a.selected_option.value,
      name: a.selected_option.text.text,
    });
});

// app.action("toggle_usergroup", async ({ ack, body, action, client }) => {
//   ack();
//   const a = action as ButtonAction;

//   const group = usergroups.find((ug) => ug.id === a.value);
//   const groupwusers = await app.client.usergroups.users.list({
//     usergroup: a.value!,
//   });
//   const ingroup = groupwusers.users!.includes(body.user.id);

//   if (ingroup) {
//     console.log(
//       "a" + groupwusers.users!.filter((u) => u !== body.user.id).join(",")
//     );

//     await app.client.usergroups.users.update({
//       usergroup: a.value!,
//       users:
//         groupwusers.users!.filter((u) => u !== body.user.id).join(",") || "",
//       include_count: true,
//     });
//   } else {
//     await app.client.usergroups.users.update({
//       usergroup: a.value!,
//       users: [...groupwusers.users!, body.user.id].join(","),
//       include_count: true,
//     });
//   }

//   await updateHome(
//     body.user.id,
//     {
//       id: a.value!,
//       name: `@${group!.handle} - ${group!.name}`,
//     },
//     ingroup ? `left group ${group!.name}` : `joined group ${group!.name}`
//   );
// });

app.start(parseInt(env.PORT, 10)).then(() => {
  console.log("⚡️ hurr durr I'ma ninja sloth");
  console.log(`🚀 Server is running on port ${env.PORT}`);
});
