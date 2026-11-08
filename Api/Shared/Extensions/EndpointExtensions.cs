using Api.Shared.Helpers;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Api.Shared.Extensions;

public static class EndpointExtensions
{
    public static IServiceCollection AddEndpoints(this IServiceCollection services)
    {
        var assembly = typeof(EndpointExtensions).Assembly;

        ServiceDescriptor[] serviceDescriptors = [.. assembly
            .DefinedTypes
            .Where(type => type is { IsAbstract: false, IsInterface: false } &&
                           type.IsAssignableTo(typeof(IEndpoint)))
            .Select(type => ServiceDescriptor.Transient(typeof(IEndpoint), type))];

        services.TryAddEnumerable(serviceDescriptors);

        return services;
    }


    public static IApplicationBuilder MapEndpoints(
        this WebApplication app,
        RouteGroupBuilder? routeGroupBuilder = null)
    {
        IEnumerable<IEndpoint> endpoints = app.Services
            .GetRequiredService<IEnumerable<IEndpoint>>();

        IEndpointRouteBuilder builder =
            routeGroupBuilder is null ? app : routeGroupBuilder;

        foreach (IEndpoint endpoint in endpoints)
        {
            endpoint.MapEndpoint(builder);
        }

        return app;
    }


}
