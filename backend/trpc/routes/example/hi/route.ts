import { z } from "zod";
import { publicProcedure } from "../../../create-context";

export default publicProcedure
  .query(() => {
    return {
      message: 'Hello from tRPC!',
      date: new Date(),
    };
  });