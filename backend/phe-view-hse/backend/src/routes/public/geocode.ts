import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { withErrorHandler } from "../../utils/withErrorHandler.ts";

const GeocodeRoute: FastifyPluginAsyncTypebox = async (app) => {
  app.route({
    method: "GET",
    url: "/geocode/reverse",
    schema: {
      tags: ["Geocoding"],
      summary: "Reverse geocoding using Nominatim",
      description: "Get address information from latitude and longitude coordinates using OpenStreetMap Nominatim",
      querystring: Type.Object({
        lat: Type.String({ description: "Latitude coordinate" }),
        lon: Type.String({ description: "Longitude coordinate" }),
      }),
      response: {
        200: Type.Any(),
        400: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        }),
        500: Type.Object({
          success: Type.Boolean(),
          message: Type.String()
        })
      }
    },
    handler: withErrorHandler(async (req, reply) => {
      const { lat, lon } = req.query as { lat: string; lon: string };

      if (!lat || !lon) {
        return reply.status(400).send({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
          {
            headers: {
              'User-Agent': 'PHE-View-HSE/1.0'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Nominatim API error: ${response.status}`);
        }

        const data = await response.json();
        return reply.send(data);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error.message || 'Failed to fetch geocoding data'
        });
      }
    }),
  });
};

export default GeocodeRoute;
