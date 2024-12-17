import { db } from "@/server/db";
import { useLoaderData } from "@remix-run/react";
import { addMonths, format } from "date-fns";
import { groupBy, prop, sortBy } from "remeda";

export const loader = async () => {
  return {
    receipts: await db.query.receipts.findMany({
      with: {
        receiptItems: true,
      },
      where: (q, o) => o.gte(q.receiptDate, addMonths(new Date(), -5)),
    }),
  };
};

const Receipts = () => {
  const data = useLoaderData<typeof loader>();

  const allItems = data.receipts.flatMap((r) =>
    r.receiptItems.map((ri) => ({
      ...ri,
      receiptDate: new Date(r.receiptDate ?? new Date()),
    }))
  );

  const groupedByItem = sortBy(
    Object.entries(
      groupBy(
        allItems.map((i) => {
          return {
            ...i,
            name: [...allItems].reverse().find((ai) => ai.code === i.code)
              ?.name,
            originalName: i.name,
          };
        }),
        (r) => r.name
      )
    ).map(([name, items]) => {
      const sortedItems = sortBy(items, prop("receiptDate"));

      return {
        name,
        items: sortBy(items, prop("unitPrice")),
        count: items.length,
        firstBoughtItem: sortedItems[0],
        lastBoughtItem: sortedItems[sortedItems.length - 1],
        sum: items.reduce(
          (acc, item) =>
            acc + parseFloat(item.quantity) * parseFloat(item.unitPrice),
          0
        ),
      };
    }),
    [prop("sum"), "desc"]
  );

  return (
    <div>
      <h1>Paragony</h1>
      <h2>Grupowane po produkcie</h2>
      <div>
        <p>Suma wszystkiego: </p>
        {groupedByItem.reduce((acc, item) => acc + item.sum, 0).toFixed(2)} zł
        <ul>
          {groupedByItem.map((item) => (
            <li key={item.name}>
              {item.name} - {Math.round(item.sum)} zł -{" "}
              {item.firstBoughtItem.code}
              <details>
                <summary>Details</summary>
                <div>
                  <p>
                    Count: {item.count}, first bought:{" "}
                    {format(item.firstBoughtItem.receiptDate, "dd.MM.yyyy")},
                    last bought:{" "}
                    {format(item.lastBoughtItem.receiptDate, "dd.MM.yyyy")}
                  </p>
                  <ol>
                    {item.items.map((item) => (
                      <li key={item.code}>
                        <details className="ml-2">
                          <summary>
                            {item.originalName} - {item.quantity} x{" "}
                            {item.unitPrice}
                          </summary>
                          <pre>{JSON.stringify(item, null, 2)}</pre>
                        </details>
                      </li>
                    ))}
                  </ol>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
      <div></div>
    </div>
  );
};

export default Receipts;
